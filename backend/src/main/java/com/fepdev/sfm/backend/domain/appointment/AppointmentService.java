package com.fepdev.sfm.backend.domain.appointment;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordMapper;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordCreateRequest;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.security.SystemUserRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class AppointmentService {

    // estados que no ocupan agenda y se excluyen en validaciones de conflicto y disponibilidad
    private static final List<Status> INACTIVE_STATUSES = List.of(Status.CANCELLED, Status.NO_SHOW);

    private final AppointmentRepository appointmentRepository;
    private final AppointmentMapper appointmentMapper;

    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final SystemUserRepository systemUserRepository;

    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalRecordMapper medicalRecordMapper;

    private final InvoiceService invoiceService;

    public AppointmentService(AppointmentRepository appointmentRepository, AppointmentMapper appointmentMapper,
            DoctorRepository doctorRepository, PatientRepository patientRepository,
            SystemUserRepository systemUserRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicalRecordMapper medicalRecordMapper, InvoiceService invoiceService) {
        this.appointmentRepository = appointmentRepository;
        this.appointmentMapper = appointmentMapper;
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.systemUserRepository = systemUserRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalRecordMapper = medicalRecordMapper;
        this.invoiceService = invoiceService;
    }

    // crear una cita
    @Transactional
    public AppointmentResponse createAppointment(AppointmentCreateRequest request) {

        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new EntityNotFoundException("El doctor con el id: " + request.doctorId() + " no existe"));

        // fix: doctor inactivo es regla de negocio, no "not found"
        if (!doctor.isActive()) {
            throw new BusinessRuleException("El doctor con el id: " + request.doctorId() + " no está activo");
        }

        // Patient no tiene isActive: solo se valida que exista
        if (!patientRepository.existsById(request.patientId())) {
            throw new EntityNotFoundException("El paciente con el id: " + request.patientId() + " no existe");
        }

        OffsetDateTime endTime = request.scheduledAt().plusMinutes(request.durationMinutes());

        // fix: overlap real entre intervalos, excluyendo citas canceladas/no_show
        if (appointmentRepository.hasScheduleConflict(request.doctorId(), request.scheduledAt(), endTime, INACTIVE_STATUSES)) {
            throw new BusinessRuleException("El doctor ya tiene una cita activa que se superpone con el horario solicitado");
        }

        Appointment appointment = appointmentMapper.toEntity(request);
        appointment.setStatus(Status.SCHEDULED);
        appointment.setScheduledEndAt(endTime);
        appointment.setDoctor(doctor);
        appointment.setPatient(patientRepository.getReferenceById(request.patientId()));
        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // confirmar una cita: SCHEDULED a CONFIRMED
    @Transactional
    public AppointmentResponse confirmAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));

        if (appointment.getStatus() != Status.SCHEDULED) {
            throw new BusinessRuleException("Solo se pueden confirmar citas en estado SCHEDULED. Estado actual: " + appointment.getStatus());
        }

        appointment.setStatus(Status.CONFIRMED);
        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // iniciar consulta: CONFIRMED a IN_PROGRESS
    @Transactional
    public AppointmentResponse startAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));

        if (appointment.getStatus() != Status.CONFIRMED) {
            throw new BusinessRuleException("Solo se pueden iniciar citas en estado CONFIRMED. Estado actual: " + appointment.getStatus());
        }

        appointment.setStatus(Status.IN_PROGRESS);
        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // completar consulta: IN_PROGRESS a COMPLETED
    @Transactional
    public AppointmentResponse completeAppointment(UUID id, MedicalRecordCreateRequest medicalRecordRequest) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));

        if (appointment.getStatus() != Status.IN_PROGRESS) {
            throw new BusinessRuleException("Solo se pueden completar citas en estado IN_PROGRESS. Estado actual: " + appointment.getStatus());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String username = auth.getName();
            Doctor authenticatedDoctor = doctorRepository.findByUserId(
                    systemUserRepository.findByUsername(username)
                            .orElseThrow(() -> new BusinessRuleException(
                                    "No se encontró el usuario autenticado en el sistema.")).getId())
                    .orElse(null);
            if (authenticatedDoctor == null) {
                throw new BusinessRuleException("El usuario autenticado no tiene un perfil de doctor vinculado.");
            }
            if (!authenticatedDoctor.getId().equals(appointment.getDoctor().getId())) {
                throw new BusinessRuleException("El doctor autenticado solo puede completar sus propias citas.");
            }
        }

        appointment.setStatus(Status.COMPLETED);

        // crear registro médico asociado a la cita completada
        MedicalRecord medicalRecord = medicalRecordMapper.toEntity(medicalRecordRequest);
        medicalRecord.setAppointment(appointment);
        medicalRecord.setPatient(appointment.getPatient());
        medicalRecord.setRecordDate(OffsetDateTime.now());
        medicalRecordRepository.save(medicalRecord);

        // crear factura draft con número generado y montos en cero
        invoiceService.createDraftInvoice(appointment);

        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // cancelar una cita: SCHEDULED o CONFIRMED a CANCELLED
    @Transactional
    public AppointmentResponse cancelAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));

        if (appointment.getStatus() != Status.SCHEDULED && appointment.getStatus() != Status.CONFIRMED) {
            throw new BusinessRuleException("Solo se pueden cancelar citas en estado SCHEDULED o CONFIRMED. Estado actual: " + appointment.getStatus());
        }

        appointment.setStatus(Status.CANCELLED);
        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // registrar no-presentación: SCHEDULED o CONFIRMED a NO_SHOW
    @Transactional
    public AppointmentResponse markNoShow(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));

        if (appointment.getStatus() != Status.SCHEDULED && appointment.getStatus() != Status.CONFIRMED) {
            throw new BusinessRuleException("Solo se puede registrar no-presentación en citas en estado SCHEDULED o CONFIRMED. Estado actual: " + appointment.getStatus());
        }

        appointment.setStatus(Status.NO_SHOW);
        return enrichWithInvoice(appointmentMapper.toResponse(appointmentRepository.save(appointment)));
    }

    // obtener una cita por su id
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("La cita con el id: " + id + " no existe"));
        return enrichWithInvoice(appointmentMapper.toResponse(appointment));
    }

    private AppointmentResponse enrichWithInvoice(AppointmentResponse base) {
        if (base == null) {
            return null;
        }
        try {
            var invoiceOpt = invoiceService.findInvoiceByAppointmentId(base.id());
            if (invoiceOpt == null || invoiceOpt.isEmpty()) {
                throw new EntityNotFoundException("Factura no disponible");
            }
            var invoice = invoiceOpt.get();
            return new AppointmentResponse(
                    base.id(),
                    base.patientId(),
                    base.patientFirstName(),
                    base.patientLastName(),
                    base.doctorId(),
                    base.doctorFirstName(),
                    base.doctorLastName(),
                    base.scheduledAt(),
                    base.scheduledEndAt(),
                    base.durationMinutes(),
                    base.status(),
                    invoice.id(),
                    invoice.invoiceNumber(),
                    base.chiefComplaint(),
                    base.notes(),
                    base.createdAt(),
                    base.updatedAt());
        } catch (EntityNotFoundException ex) {
            return new AppointmentResponse(
                    base.id(),
                    base.patientId(),
                    base.patientFirstName(),
                    base.patientLastName(),
                    base.doctorId(),
                    base.doctorFirstName(),
                    base.doctorLastName(),
                    base.scheduledAt(),
                    base.scheduledEndAt(),
                    base.durationMinutes(),
                    base.status(),
                    null,
                    null,
                    base.chiefComplaint(),
                    base.notes(),
                    base.createdAt(),
                    base.updatedAt());
        }
    }

    // listar citas con filtros opcionales: doctor, paciente, estado, rango de fechas
    @Transactional(readOnly = true)
    public Page<AppointmentSummaryResponse> getAppointments(UUID doctorId, UUID patientId, Status status,
            OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable) {
        return appointmentRepository.findWithFilters(doctorId, patientId, status, startDate, endDate, pageable)
                .map(appointmentMapper::toSummaryResponse);
    }

    // obtener los slots ocupados de un médico en un rango de fechas, excluyendo canceladas y no_show
    // consumidor calcula los huecos libres a partir de esta lista
    @Transactional(readOnly = true)
    public List<AppointmentSummaryResponse> getDoctorAvailability(UUID doctorId, OffsetDateTime startDate, OffsetDateTime endDate) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new EntityNotFoundException("El doctor con el id: " + doctorId + " no existe"));

        return appointmentRepository
                .findActiveByDoctorIdBetween(doctorId, startDate, endDate, INACTIVE_STATUSES)
                .stream()
                .map(appointmentMapper::toSummaryResponse)
                .toList();
    }
}

package com.fepdev.sfm.backend.domain.doctor;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.AppointmentMapper;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class DoctorService {
    
    private final DoctorRepository doctorRepository;
    private final DoctorMapper doctorMapper;

    private final AppointmentRepository appointmentRepository;
    private final AppointmentMapper appointmentMapper;

    public DoctorService(DoctorRepository doctorRepository, DoctorMapper doctorMapper, AppointmentRepository appointmentRepository, AppointmentMapper appointmentMapper ) {
        this.doctorRepository = doctorRepository;
        this.doctorMapper = doctorMapper;
        this.appointmentRepository = appointmentRepository;
        this.appointmentMapper = appointmentMapper;

    }

    // crear doctor, se valida que no se repita el numero de licencia
    @Transactional
    public DoctorResponse createDoctor(DoctorCreateRequest request){

        if (doctorRepository.existsByLicenseNumber(request.licenseNumber())) {
            throw new BusinessRuleException("El doctor con el número de licencia " + request.licenseNumber() + " ya se encuentra registrado en el sistema.");
        }

        Doctor doctor = doctorMapper.toEntity(request);
        doctor.setActive(true); // Por defecto activo
        Doctor savedDoctor = doctorRepository.save(doctor);
        return doctorMapper.toResponse(savedDoctor);
    }

    // actualizar un doctor, validando id
    @Transactional
    public DoctorResponse updateDoctor(UUID id, DoctorUpdateRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Doctor con ID " + id + " no encontrado."));

        doctorMapper.updateEntity(request, doctor);
        Doctor updatedDoctor = doctorRepository.save(doctor);
        return doctorMapper.toResponse(updatedDoctor);
    }

    // desactivar un doctor
    @Transactional
    public void deactivateDoctor(UUID id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Doctor con ID " + id + " no encontrado."));

        doctor.setActive(false);
        doctorRepository.save(doctor);
    }

    // encontrar doctor por id, validando que exista
    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(UUID id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Doctor con ID " + id + " no encontrado."));
        return doctorMapper.toResponse(doctor);
    }

    // encontrar doctor por numero de licencia, validando que exista
    @Transactional(readOnly = true)
    public DoctorResponse getDoctorByLicenseNumber(String licenseNumber) {
        Doctor doctor = doctorRepository.findByLicenseNumber(licenseNumber)
                .orElseThrow(() -> new EntityNotFoundException("Doctor con número de licencia " + licenseNumber + " no encontrado."));
        return doctorMapper.toResponse(doctor);
    }

    // listar doctores con filtro por especialidad y estado, y paginacion
    @Transactional(readOnly = true)
    public Page<DoctorSummaryResponse> getDoctors(Boolean isActive, String specialty, Pageable pageable) {
        Page<Doctor> doctorsPage = doctorRepository.findWithFilters(isActive, specialty, pageable);
        return doctorsPage.map(doctorMapper::toSummaryResponse);
    }

    // obtener agenda de un doctor, con filtros opcionales de fecha, validando que el doctor exista
    @Transactional(readOnly = true)
    public Page<AppointmentSummaryResponse> getAppointmentsByDoctorId(
            UUID doctorId, 
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            Pageable pageable) {
            
        if (!doctorRepository.existsById(doctorId)) {
            throw new EntityNotFoundException("Doctor con ID " + doctorId + " no encontrado.");
        }

        Page<Appointment> appointmentsPage = appointmentRepository.findDoctorAgenda(doctorId, startDate, endDate, pageable);
        return appointmentsPage.map(appointmentMapper::toSummaryResponse);
    }

}

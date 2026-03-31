package com.fepdev.sfm.backend.integration.e2e;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.AppointmentService;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.catalog.Category;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalogRepository;
import com.fepdev.sfm.backend.domain.catalog.Unit;
import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicyRepository;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProvider;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProviderRepository;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceService;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecord;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.Prescription;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordCreateRequest;
import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentService;

import jakarta.persistence.EntityManager;

@SpringBootTest
@Testcontainers
@ActiveProfiles("integration-e2e")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public abstract class AbstractPostgresFlowE2ETest {

    static {
        System.setProperty("docker.host", System.getProperty("docker.host", "unix:///var/run/docker.sock"));
        System.setProperty("docker.api.version", System.getProperty("docker.api.version", "1.54"));
    }

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("sfm_e2e_db")
            .withUsername("sfm")
            .withPassword("sfm");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    }

    @Autowired
    AppointmentService appointmentService;

    @Autowired
    InvoiceService invoiceService;

    @Autowired
    PaymentService paymentService;

    @Autowired
    PatientRepository patientRepository;

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    AppointmentRepository appointmentRepository;

    @Autowired
    MedicalRecordRepository medicalRecordRepository;

    @Autowired
    InvoiceRepository invoiceRepository;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    ServicesCatalogRepository servicesCatalogRepository;

    @Autowired
    MedicationsCatalogRepository medicationsCatalogRepository;

    @Autowired
    InsuranceProviderRepository insuranceProviderRepository;

    @Autowired
    InsurancePolicyRepository insurancePolicyRepository;

    @Autowired
    PrescriptionRepository prescriptionRepository;

    @Autowired
    EntityManager entityManager;

    protected Patient createPatient(String key) {
        Patient patient = new Patient();
        patient.setDni(("DNI" + key + System.nanoTime()).substring(0, 20));
        patient.setFirstName("Ana");
        patient.setLastName("Lopez");
        patient.setBirthDate(LocalDate.of(1990, 1, 1));
        patient.setGender(Gender.FEMALE);
        patient.setPhone("5551000");
        patient.setEmail("ana." + key + "@mail.com");
        return patientRepository.save(patient);
    }

    protected Doctor createDoctor(String key) {
        Doctor doctor = new Doctor();
        doctor.setLicenseNumber(("LIC" + key + System.nanoTime()).substring(0, 20));
        doctor.setFirstName("Luis");
        doctor.setLastName("Torres");
        doctor.setSpecialty("General");
        doctor.setPhone("5552000");
        doctor.setEmail("doc." + key + "@clinic.com");
        doctor.setActive(true);
        return doctorRepository.save(doctor);
    }

    protected ServicesCatalog createServiceCatalog(String key, BigDecimal price) {
        ServicesCatalog service = new ServicesCatalog();
        service.setCode(("SRV" + key + System.nanoTime()).substring(0, 20));
        service.setName("Consulta " + key);
        service.setDescription("Servicio para flujo " + key);
        service.setPrice(price);
        service.setCategory(Category.CONSULTATION);
        service.setIsActive(true);
        return servicesCatalogRepository.save(service);
    }

    protected MedicationsCatalog createMedication(String key, BigDecimal price, boolean requiresPrescription) {
        MedicationsCatalog medication = new MedicationsCatalog();
        medication.setCode(("MED" + key + System.nanoTime()).substring(0, 20));
        medication.setName("Medicamento " + key);
        medication.setDescription("Medicamento para flujo " + key);
        medication.setPrice(price);
        medication.setUnit(Unit.TABLET);
        medication.setRequiresPrescription(requiresPrescription);
        medication.setActive(true);
        return medicationsCatalogRepository.save(medication);
    }

    protected InsuranceProvider createInsuranceProvider(String key, boolean active) {
        InsuranceProvider provider = new InsuranceProvider();
        provider.setName("Seguro " + key);
        provider.setCode(("SEG" + key + System.nanoTime()).substring(0, 20));
        provider.setPhone("5553000");
        provider.setEmail("seg." + key + "@mail.com");
        provider.setActive(active);
        return insuranceProviderRepository.save(provider);
    }

    protected InsurancePolicy createInsurancePolicy(Patient patient, InsuranceProvider provider, boolean active,
            LocalDate startDate, LocalDate endDate, BigDecimal coveragePercentage, BigDecimal deductible, String key) {
        InsurancePolicy policy = new InsurancePolicy();
        policy.setPatient(patient);
        policy.setProvider(provider);
        policy.setPolicyNumber(("POL" + key + System.nanoTime()).substring(0, 20));
        policy.setCoveragePercentage(coveragePercentage);
        policy.setDeductible(deductible);
        policy.setStartDate(startDate);
        policy.setEndDate(endDate);
        policy.setActive(active);
        return insurancePolicyRepository.save(policy);
    }

    protected AppointmentResponse createAndCompleteAppointment(Patient patient, Doctor doctor) {
        AppointmentResponse created = createScheduledAppointment(patient, doctor);
        appointmentService.confirmAppointment(created.id());
        appointmentService.startAppointment(created.id());
        appointmentService.completeAppointment(created.id(), new MedicalRecordCreateRequest(
                patient.getId(),
                created.id(),
                null,
                "Sin hallazgos relevantes",
                "Evolucion favorable",
                OffsetDateTime.now()));

        return appointmentService.getAppointmentById(created.id());
    }

    protected AppointmentResponse createScheduledAppointment(Patient patient, Doctor doctor) {
        AppointmentCreateRequest createRequest = new AppointmentCreateRequest(
                patient.getId(),
                doctor.getId(),
                OffsetDateTime.now().plusDays(1).withSecond(0).withNano(0),
                30,
                "Control general",
                "Notas E2E");
        return appointmentService.createAppointment(createRequest);
    }

    protected Invoice getInvoiceByAppointmentId(UUID appointmentId) {
        return entityManager.createQuery(
                        "SELECT i FROM Invoice i WHERE i.appointment.id = :appointmentId", Invoice.class)
                .setParameter("appointmentId", appointmentId)
                .getSingleResult();
    }

    protected MedicalRecord getMedicalRecordByAppointmentId(UUID appointmentId) {
        return medicalRecordRepository.findByAppointmentId(appointmentId).orElseThrow();
    }

    protected Appointment getAppointment(UUID appointmentId) {
        return appointmentRepository.findById(appointmentId).orElseThrow();
    }

    protected Invoice getInvoice(UUID invoiceId) {
        return invoiceRepository.findById(invoiceId).orElseThrow();
    }

    protected Prescription createPrescription(Appointment appointment, MedicalRecord medicalRecord,
            MedicationsCatalog medication, String key) {
        Prescription prescription = new Prescription();
        prescription.setAppointment(appointment);
        prescription.setMedicalRecord(medicalRecord);
        prescription.setMedication(medication);
        prescription.setDosage("500mg " + key);
        prescription.setFrequency("cada 8 horas");
        prescription.setDurationDays(5);
        prescription.setInstructions("Tomar con alimentos");
        return prescriptionRepository.save(prescription);
    }
}

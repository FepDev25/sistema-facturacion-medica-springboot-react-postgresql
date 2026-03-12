package com.fepdev.sfm.backend.domain.patient.dto;

import java.time.LocalDate;

import com.fepdev.sfm.backend.domain.patient.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

public record PatientUpdateRequest(

    @Size(max = 100, message = "El primer nombre no puede exceder los 100 caracteres")
    String firstName,

    @Size(max = 100, message = "El apellido no puede exceder los 100 caracteres")
    String lastName,

    @Past(message = "La fecha de nacimiento debe ser en el pasado")
    LocalDate birthDate,

    Gender gender,

    @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
    String phone,

    @Email(message = "El formato del correo electrónico no es válido")
    @Size(max = 100, message = "El correo no puede exceder los 100 caracteres")
    String email,

    @Size(max = 200, message = "La dirección no puede exceder los 200 caracteres")
    String address,

    @Size(max = 5, message = "El tipo de sangre no puede exceder los 5 caracteres")
    String bloodType,

    @Size(max = 500, message = "La descripción de alergias no puede exceder los 500 caracteres")
    String allergies
) {}

package com.fepdev.sfm.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Verifica que el contexto de Spring arranca correctamente.
// Requiere PostgreSQL y Redis activos; ejecutar manualmente o en CI con servicios disponibles.
@SpringBootTest
@Disabled("Requiere infraestructura real (PostgreSQL + Redis)")
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }
}

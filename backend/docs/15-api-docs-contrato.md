# API Docs por contrato (OpenAPI)

Este proyecto documenta la API con un enfoque contract-first, usando un archivo OpenAPI versionado en el repo.

## Estado actual

- Contrato fuente: `openapi/openapi.yaml`
- Validacion contrato vs codigo: `openapi/tools/validate_contract_vs_code.py`
- Politica: el contrato debe reflejar exactamente los endpoints reales del backend.

## Forma oficial de visualizar docs

La forma estandar del equipo para ver docs tipo Swagger es con Docker (Swagger UI externo), sin acoplar SpringDoc al backend.

Comando:

```bash
docker run --rm -p 8081:8080 \
  -e SWAGGER_JSON=/spec/openapi.yaml \
  -v "$PWD/openapi:/spec" \
  swaggerapi/swagger-ui
```

URL de acceso:

- `http://localhost:8081`

## Verificacion minima antes de compartir docs

```bash
python openapi/tools/validate_contract_vs_code.py
```

Si este comando falla, no se debe publicar el contrato hasta alinear codigo y OpenAPI.

## Flujo de trabajo recomendado

1. Cambiar endpoint/DTO en backend.
2. Actualizar `openapi/openapi.yaml`.
3. Ejecutar `validate_contract_vs_code.py`.
4. Levantar Swagger UI con Docker para revision funcional.

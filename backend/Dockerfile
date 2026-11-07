# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q --no-transfer-progress

COPY src ./src
RUN ./mvnw package -DskipTests -q --no-transfer-progress

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-Xmx160m", \
  "-XX:MaxMetaspaceSize=160m", \
  "-XX:ReservedCodeCacheSize=64m", \
  "-XX:+UseG1GC", \
  "-Xss512k", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "app.jar"]

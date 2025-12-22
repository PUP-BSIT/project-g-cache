# ----------------------------
# Stage 1: Build with Maven
# ----------------------------
FROM maven:3.9.4-eclipse-temurin-21 AS build

WORKDIR /workspace

# Copy only pom first to leverage Docker layer caching for dependencies
COPY pom.xml ./

# Download dependencies (offline) to cache them in a layer
RUN mvn -B -DskipTests dependency:go-offline

# Copy the source and build the application
COPY src ./src
RUN mvn -B -DskipTests package

# ----------------------------
# Stage 2: Runtime (smaller image)
# ----------------------------
FROM eclipse-temurin:21-jre

WORKDIR /app

# Install curl for health checks (with retry for mirror sync issues)
RUN apt-get update || apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the built jar from the builder stage
COPY --from=build /workspace/target/*.jar app.jar

# Expose application port
EXPOSE 8081

# Health check - verify the application is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8081/actuator/health || exit 1

# JVM tuning for containerized environment
# -XX:+UseContainerSupport: Respect container memory limits
# -XX:MaxRAMPercentage=75: Use up to 75% of container memory for heap
# -XX:+UseG1GC: Use G1 garbage collector for better latency
# -XX:+ExitOnOutOfMemoryError: Exit on OOM instead of hanging
# -Djava.security.egd: Faster random number generation for startup
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
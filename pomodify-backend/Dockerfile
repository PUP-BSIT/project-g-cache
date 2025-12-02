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

# Copy the built jar from the builder stage
COPY --from=build /workspace/target/*.jar app.jar

# Expose application port
EXPOSE 8081

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
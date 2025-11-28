# Use OpenJDK 17 base image
FROM eclipse-temurin:21-jdk

# Set working directory
WORKDIR /app

# Copy jar file
COPY target/pomodify-backend-*.jar app.jar

# Expose port
EXPOSE 8081

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]

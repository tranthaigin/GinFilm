# ============================================================
# Stage 1: Build - Dùng Maven + JDK 21 để compile Spring Boot
# ============================================================
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy pom.xml trước để cache dependencies (Docker layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code và build
COPY src ./src
RUN mvn package -DskipTests -B

# ============================================================
# Stage 2: Runtime - Chỉ cần JRE 21 để chạy JAR (image nhỏ hơn)
# ============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Tạo user non-root để bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy JAR từ build stage
COPY --from=builder /app/target/*.jar app.jar

# Tạo thư mục uploads và phân quyền
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

# Thiết lập môi trường mặc định là production
ENV SPRING_PROFILES_ACTIVE=prod

# Railway dùng PORT env variable
EXPOSE 8080

# JVM tuning cho container (giới hạn memory)
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

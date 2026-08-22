FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends docker-cli docker-buildx \
  && rm -rf /var/lib/apt/lists/*

# Root is used locally so Jenkins can talk to Docker Desktop through docker.sock.
USER root

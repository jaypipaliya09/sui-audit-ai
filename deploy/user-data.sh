#!/bin/bash
set -e
# 4GB swap so 1GB micro instance can build/run the stack
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
# Docker + compose plugin
export DEBIAN_FRONTEND=noninteractive
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable --now docker
touch /home/ubuntu/.bootstrap-done

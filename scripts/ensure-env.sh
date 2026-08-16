#!/bin/bash
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Restored .env from .env.example"
fi

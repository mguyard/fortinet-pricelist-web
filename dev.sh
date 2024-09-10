#!/bin/bash

# Construire l'image
docker build -t fortinet-pricelist-parser-dev .

# Lancer le container avec les volumes montés
docker run -it --rm \
  -p 3000:3000 \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/data:/data" \
  fortinet-pricelist-parser-dev
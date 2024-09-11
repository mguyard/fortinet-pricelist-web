FROM node:20-alpine

# Installer OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install
RUN npm install -g nodemon

# Créer un répertoire pour les certificats
RUN mkdir -p /etc/certs

# Copier le script de génération de certificat
COPY generate-cert.sh /generate-cert.sh
RUN chmod +x /generate-cert.sh

# Copier le contenu du répertoire src dans /app/src
COPY src /app/src

# Définir les volumes
VOLUME /data

# Exposer le port HTTPS (par défaut 3000)
EXPOSE 3000

# Exécuter le script de génération de certificat puis démarrer l'application avec nodemon
CMD ["/bin/sh", "-c", "/generate-cert.sh && nodemon --legacy-watch src/index.js"]
#!/bin/sh

# Générer une clé privée
openssl genpkey -algorithm RSA -out /etc/certs/key.pem

# Générer une demande de signature de certificat (CSR)
openssl req -new -key /etc/certs/key.pem -out /etc/certs/csr.pem -subj "/CN=localhost"

# Générer un certificat auto-signé
openssl x509 -req -days 365 -in /etc/certs/csr.pem -signkey /etc/certs/key.pem -out /etc/certs/cert.pem

# Supprimer le CSR car nous n'en avons plus besoin
rm /etc/certs/csr.pem

echo "Certificat auto-signé généré avec succès."
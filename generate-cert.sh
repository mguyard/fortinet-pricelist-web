#!/bin/sh

# Generate a private key
openssl genpkey -algorithm RSA -out /etc/certs/key.pem

# Generate a Certificate Signing Request (CSR)
openssl req -new -key /etc/certs/key.pem -out /etc/certs/csr.pem -subj "/CN=localhost"

# Generate a self-signed certificate
openssl x509 -req -days 365 -in /etc/certs/csr.pem -signkey /etc/certs/key.pem -out /etc/certs/cert.pem

# Remove the CSR as we no longer need it
rm /etc/certs/csr.pem

echo "Self-signed certificate generated successfully."
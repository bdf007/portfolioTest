# Environnement de production
FROM node:18.17.0

# Créer et définir le répertoire de travail
WORKDIR /usr/src/app

# Définir les variables d'environnement
ENV PATH /usr/src/app/node_modules/.bin:$PATH

# Variables d'environnement et d'argument pour les variables sensibles
ARG GENERATE_SOURCEMAP
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

ARG PORT
ENV PORT=${PORT}

ARG MONGO_URI
ENV MONGO_URI=${MONGO_URI}

ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}

ARG BACKEND_URL
ENV BACKEND_URL=${BACKEND_URL}

ARG BACKEND_IMAGE_URL
ENV BACKEND_IMAGE_URL=${BACKEND_IMAGE_URL}

ARG FRONTEND_URL
ENV FRONTEND_URL=${FRONTEND_URL}

# Copier package.json et package-lock.json pour installer les dépendances
COPY package*.json ./

# Installer les dépendances pour le backend
RUN npm install -g npm

# Copier tout le code de l'application
COPY . .

# Construire l'application frontend
RUN cd client && npm install && npm run build

# Installer les dépendances du backend (sans les devDependencies)
RUN cd server && npm install --production

# Copier les fichiers nécessaires dans le dossier de build
RUN cp ./client/public/robots.txt ./client/build
RUN cp ./client/public/sitemap.xml ./client/build

# Exposer le port sur lequel l'application sera disponible
EXPOSE ${PORT}

# Commande pour démarrer le serveur Node.js
CMD ["node", "server/index.js"]

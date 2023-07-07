# production environment
FROM node:18.16.1
# Create app directory
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
# Create env variables
ENV PATH /usr/src/app/node_modules/.bin:$PATH
ARG GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ARG REACT_APP_API_URL=${REACT_APP_API_URL}

ENV PORT=${PORT}
ARG PORT=${PORT}

ENV MONGO_URI=${MONGO_URI}
ARG MONGO_URI=${MONGO_URI}

ENV JWT_SECRET=${JWT_SECRET}
ARG JWT_SECRET=${JWT_SECRET}

ENV BACKEND_URL=${BACKEND_URL}
ARG BACKEND_URL=${BACKEND_URL}

ENV BACKEND_IMAGE_URL=${BACKEND_IMAGE_URL}
ARG BACKEND_IMAGE_URL=${BACKEND_IMAGE_URL}

ENV FRONTEND_URL=${FRONTEND_URL}
ARG FRONTEND_URL=${FRONTEND_URL}

COPY ./ /usr/src/app
RUN npm install -g npm
# Create front app
RUN cd ./client && npm i && npm run build
# RUN mkdir -p ./client/dist/src && cp -r ./client/src/assets ./client/dist/src
RUN cp ./client/public/robots.txt ./client/build
RUN cp ./client/public/sitemap.xml ./client/build
# Create back app
RUN cd ./server && npm i --prod

# expose full app on APP_PORT
EXPOSE ${PORT}
CMD ["node", "server/index.js"]

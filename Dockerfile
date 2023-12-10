FROM node:lts-alpine

RUN apk add g++ make python3

WORKDIR /mtl/app
COPY  . .

RUN npm ci
RUN npm test

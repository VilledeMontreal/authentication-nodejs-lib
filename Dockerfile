FROM node:lts-alpine

LABEL maintainer="morgan.martinet@montreal.ca"

RUN apk add --update bash nano tzdata git && \
  rm -rf /var/cache/apk/* && \
  rm /bin/sh && ln -s /bin/bash /bin/sh && \
  cp /usr/share/zoneinfo/America/Montreal /etc/localtime && \
  echo "America/Montreal" >  /etc/timezone && \
  printf "\\nalias ll=\"ls -la\"\\n" >> ~/.bashrc && \
  mkdir -p /mtl/app && \
  chown node /mtl/app

USER node

WORKDIR /mtl/app

# # Note that we need the souce code in order to let Jenkins
# # invoke our Sonarqube config.
# COPY --chown=node . /mtl/app

# RUN  npm install --no-cache

CMD ["node", "--version"]

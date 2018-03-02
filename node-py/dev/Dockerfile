FROM node:alpine

# RUN echo '@edge http://nl.alpinelinux.org/alpine/edge/main' >> /etc/apk/repositories
# # RUN echo '@community http://nl.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories

# RUN apk update && apk upgrade \
#   && apk add git build-base nodejs-dev@edge nodejs@edge \
#   && npm install -g npm \
#   && rm -rf /var/cache/apk/*

RUN apk add vips-dev fftw-dev --update-cache --repository https://dl-3.alpinelinux.org/alpine/edge/testing/
RUN apk add vips-dev --update-cache --repository http://wjordan-apk.s3.amazonaws.com/ --allow-untrusted
RUN apk add python nodejs g++ make
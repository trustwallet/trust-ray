FROM ubuntu:17.04

COPY ./entrypoints /entrypoints

WORKDIR /opt/server

RUN apt-get update && apt-get install -y curl git make
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get update && apt-get install -y nodejs && npm install -g npm@5.6

CMD /entrypoints/run

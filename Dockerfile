FROM alpine
RUN apk add --update nodejs
RUN apk add --update npm
RUN apk add --update git

WORKDIR /app
ADD package*.json ./
RUN npm ci
COPY . .

EXPOSE 3303

CMD ["npm", "start"]

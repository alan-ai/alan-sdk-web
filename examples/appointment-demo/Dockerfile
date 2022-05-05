FROM node:16-bullseye-slim as frontend-build

COPY appointment-frontend/package.json appointment-frontend/package-lock.json /app/

WORKDIR /app
RUN npm i --no-audit

COPY appointment-frontend /app

RUN npm run build




FROM node:16-bullseye-slim

COPY appointment-backend/package.json appointment-backend/package-lock.json /app/appointment-backend/

WORKDIR /app/appointment-backend

RUN npm i --no-audit

COPY appointment-backend /app/appointment-backend

COPY --from=frontend-build /app/build /app/appointment-frontend/build

ENV PORT=80

EXPOSE 80

CMD npm run start

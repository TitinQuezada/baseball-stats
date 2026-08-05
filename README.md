# BaseballStats

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.3.

## Configuracion inicial

Antes de correr el proyecto por primera vez hay que crear el archivo de configuracion de Firebase,
que no esta versionado en el repositorio:

1. Copia `src/environments/environment.example.ts` como `src/environments/environment.ts`.
2. Completa los valores con la configuracion de tu proyecto de Firebase (Firebase Console ->
   Configuracion del proyecto -> Tus apps -> app web -> "SDK setup and configuration"):

   | Propiedad | Descripcion |
   |---|---|
   | `production` | `false` para desarrollo local, `true` para builds de produccion |
   | `firebase.apiKey` | API key de la app web de Firebase |
   | `firebase.authDomain` | Dominio de autenticacion (`<proyecto>.firebaseapp.com`) |
   | `firebase.projectId` | ID del proyecto de Firebase |
   | `firebase.storageBucket` | Bucket de Cloud Storage del proyecto |
   | `firebase.messagingSenderId` | Sender ID de Firebase Cloud Messaging |
   | `firebase.appId` | ID de la app web dentro del proyecto de Firebase |

`environment.ts` esta en `.gitignore`, asi que los cambios que hagas ahi no se van a commitear.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

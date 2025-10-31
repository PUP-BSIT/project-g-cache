import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { config } from './app/app.config.server';

// The server runtime must pass a BootstrapContext when invoking this
// bootstrap function so the platform is correctly created. Keep the
// context parameter and forward it to bootstrapApplication.
const bootstrap = (context: BootstrapContext) =>
	bootstrapApplication(AppComponent, config, context);

export default bootstrap;

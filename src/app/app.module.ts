import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SpaceInvendorsComponent } from './space-invendors/space-invendors.component';

@NgModule({
  declarations: [
    AppComponent,
    SpaceInvendorsComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

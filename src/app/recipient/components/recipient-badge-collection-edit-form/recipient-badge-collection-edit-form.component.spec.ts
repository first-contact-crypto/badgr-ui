// tslint:disable
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { By } from '@angular/platform-browser';
// import { Observable } from 'rxjs/Observable';
// import 'rxjs/add/observable/of';
// import 'rxjs/add/observable/throw';

import {Component, Directive} from '@angular/core';
import {RecipientBadgeCollectionEditFormComponent} from './recipient-badge-collection-edit-form.component';
import {Router, ActivatedRoute} from '@angular/router';
import {SessionService} from '../../../common/services/session.service';
import {FormBuilder} from '@angular/forms';
import {Title} from '@angular/platform-browser';
import {MessageService} from '../../../common/services/message.service';
import {AppConfigService} from '../../../common/app-config.service';
import {RecipientBadgeCollectionManager} from '../../services/recipient-badge-collection-manager.service';

@Injectable();
class MockRouter { navigate = jest.fn(); }

@Injectable()
class MockSessionService { }

@Injectable()
class MockMessageService { }

@Injectable()
class MockAppConfigService { }

@Injectable()
class MockRecipientBadgeCollectionManager { }

describe('RecipientBadgeCollectionEditFormComponent', () => {
  let fixture;
  let component;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        RecipientBadgeCollectionEditFormComponent
      ],
      providers: [
        {provide: Router, useClass: MockRouter},
        ActivatedRoute,
        {provide: SessionService, useClass: MockSessionService},
        FormBuilder,
        Title,
        {provide: MessageService, useClass: MockMessageService},
        {provide: AppConfigService, useClass: MockAppConfigService},
        {provide: RecipientBadgeCollectionManager, useClass: MockRecipientBadgeCollectionManager},
      ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    }).compileComponents();
    fixture = TestBed.createComponent(RecipientBadgeCollectionEditFormComponent);
    component = fixture.debugElement.componentInstance;
  });

  it('should create a component', async () => {
    expect(component).toBeTruthy();
  });

  it('should run #ngOnInit()', async () => {
    // const result = component.ngOnInit();
  });

  it('should run #startEditing()', async () => {
    // const result = component.startEditing();
  });

  it('should run #cancelEditing()', async () => {
    // const result = component.cancelEditing();
  });

  it('should run #onSubmit()', async () => {
    // const result = component.onSubmit();
  });

});
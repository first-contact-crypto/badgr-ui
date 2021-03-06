import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";

import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { EmailValidator } from "../../../common/validators/email.validator";
import { UserCredential } from "../../../common/model/user-credential.type";
import { SessionService } from "../../../common/services/session.service";
import { MessageService } from "../../../common/services/message.service";
import { BaseRoutableComponent } from "../../../common/pages/base-routable.component";
import { Title } from "@angular/platform-browser";


import { markControlsDirty } from "../../../common/util/form-util";
import { FormFieldText } from "../../../common/components/formfield-text";
import { QueryParametersService } from "../../../common/services/query-parameters.service";
import { OAuthManager } from "../../../common/services/oauth-manager.service";
import { ExternalToolsManager } from "../../../externaltools/services/externaltools-manager.service";
import { UserProfileManager } from "../../../common/services/user-profile-manager.service";
import { HttpErrorResponse } from '@angular/common/http';
import { AppConfigService } from "../../../common/app-config.service";


@Component({
	selector: 'login',
	templateUrl: './login.component.html',
})
export class LoginComponent extends BaseRoutableComponent implements OnInit, AfterViewInit {

	get theme() { return this.configService.theme }
	loginForm: FormGroup;
	verifiedName: string;
	verifiedEmail: string;

	@ViewChild("passwordField")
	passwordField: FormFieldText;

	initFinished: Promise<any> = new Promise(() => {});
	loginFinished: Promise<any>;

	constructor(
		private fb: FormBuilder,
		private title: Title,
		public sessionService: SessionService,
		private messageService: MessageService,
		private configService: AppConfigService,
		private queryParams: QueryParametersService,
		public oAuthManager: OAuthManager,
		private externalToolsManager: ExternalToolsManager,
		private profileManager: UserProfileManager,
		router: Router,
		route: ActivatedRoute
	) {
		super(router, route);
		title.setTitle(`Login - ${this.configService.theme['serviceName'] || "Badgr"}`);
		this.handleQueryParamCases();
	}

	ngOnInit() {
		super.ngOnInit();

		let email: string;

		this.initVerifiedData();

		email = this.verifiedEmail || '';

		this.loginForm = this.fb.group({
			'username': [
				email,
				Validators.compose([
					Validators.required,
					EmailValidator.validEmail
				])
			],
			'password': [ '', Validators.required ],
			'rememberMe': 'false',
		});
	}

	ngAfterViewInit(): void {
		if (this.verifiedEmail) {
			setTimeout(() => this.passwordField.focus());
		}
	}

	submitAuth() {
		let credential: UserCredential = new UserCredential(
			this.loginForm.value.username, this.loginForm.value.password);

		this.loginFinished = this.sessionService.login(credential)
			.then(
				() => {
					this.profileManager.userProfilePromise.then((profile) => {
						// fetch user profile and emails to check if they are verified
						profile.emails.updateList().then(() => {
							if (profile.isVerified) {
								if (this.oAuthManager.isAuthorizationInProgress) {
									this.router.navigate([ '/auth/oauth2/authorize' ]);
								} else {
									this.externalToolsManager.externaltoolsList.updateIfLoaded();
									this.router.navigate([ 'recipient' ]);
								}
							} else {
								this.router.navigate([ 'signup/success', { email: profile.emails.entities[0].email } ]);
							}

						})
					});

				},
				(response: HttpErrorResponse) => {
					const body = response.error as any;

					let msg = "Login failed. Please check your email and password and try again.";
					if (body['error'] === 'login attempts throttled') {
						if (body['expires']) {
							if (body['expires'] > 60) {
								msg = `Too many login attempts. Try again in ${Math.ceil(body['expires'] / 60)} minutes.`;
							} else {
								msg = `Too many login attempts. Try again in ${body['expires']} seconds.`
							}
						} else {
							msg = "Too many login attempts. Please wait and try again."
						}
					}
					this.messageService.reportHandledError(msg, response);
				}
			)
			.then(() => this.loginFinished = null);
	}

	clickSubmit(ev) {
		if (!this.loginForm.valid) {
			ev.preventDefault();
			markControlsDirty(this.loginForm);
		}
	}

	private handleQueryParamCases() {
		try {
			// Handle authcode exchange
			const authCode = this.queryParams.queryStringValue("authCode", true);
			if (authCode) {
				this.sessionService.exchangeCodeForToken(authCode).then(token => {
					this.sessionService.storeToken(token);
					this.externalToolsManager.externaltoolsList.updateIfLoaded();
					this.initFinished = this.router.navigate([ 'recipient' ]);
				});
				return;
			} else if (this.queryParams.queryStringValue("authToken", true)) {
				this.sessionService.storeToken({
					access_token: this.queryParams.queryStringValue("authToken", true)
				});

				this.externalToolsManager.externaltoolsList.updateIfLoaded();
				this.initFinished = this.router.navigate([ 'recipient' ]);
				return;
			} else if (this.queryParams.queryStringValue("authError", true)) {
				this.sessionService.logout();
				this.messageService.reportHandledError(this.queryParams.queryStringValue("authError", true), null, true);
			} else if (this.sessionService.isLoggedIn) {
				this.externalToolsManager.externaltoolsList.updateIfLoaded();
				this.initFinished = this.router.navigate([ 'recipient' ]);
				return;
			}

			this.initFinished = Promise.resolve(true);
		} finally {
			this.queryParams.clearInitialQueryParams();
		}
	}

	private initVerifiedData() {
		this.verifiedName = this.queryParams.queryStringValue('name');
		this.verifiedEmail = this.queryParams.queryStringValue('email');
	}
}

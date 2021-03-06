import { Component, OnInit } from "@angular/core";

import { ActivatedRoute, Router } from "@angular/router";
import { MessageService } from "../../../common/services/message.service";
import { BadgeClassManager } from "../../services/badgeclass-manager.service";
import { BadgeClass } from "../../models/badgeclass.model";
import { Issuer } from "../../models/issuer.model";
import { Title } from "@angular/platform-browser";
import { BaseAuthenticatedRoutableComponent } from "../../../common/pages/base-authenticated-routable.component";
import { SessionService } from "../../../common/services/session.service";
import { StringMatchingUtil } from "../../../common/util/string-matching-util";
import { CommonDialogsService } from "../../../common/services/common-dialogs.service";
import { BadgeInstanceManager } from "../../services/badgeinstance-manager.service";
import { BadgeClassInstances, BadgeInstance } from "../../models/badgeinstance.model";


import { IssuerManager } from "../../services/issuer-manager.service";
import { BadgrApiFailure } from "../../../common/services/api-failure";
import { preloadImageURL } from "../../../common/util/file-util";
import { EventsService } from "../../../common/services/events.service";
import { ExternalToolsManager } from "../../../externaltools/services/externaltools-manager.service";
import { ApiExternalToolLaunchpoint } from "../../../externaltools/models/externaltools-api.model";
import { BadgeInstanceSlug } from "../../models/badgeinstance-api.model";
import { badgeShareDialogOptions } from "../../../recipient/components/recipient-earned-badge-detail/recipient-earned-badge-detail.component";
import { ShareSocialDialogOptions } from "../../../common/dialogs/share-social-dialog/share-social-dialog.component";
import { AppConfigService } from "../../../common/app-config.service";

@Component({
	selector: 'badgeclass-detail',
	templateUrl: './badgeclass-detail.component.html'
})
export class BadgeClassDetailComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	get searchQuery() { return this._searchQuery; }

	set searchQuery(query) {
		this._searchQuery = query;
		this.loadInstances(query);
	}

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	get confirmDialog() {
		return this.dialogService.confirmDialog;
	}

	get recipientCount() {
		return this.badgeClass ? this.badgeClass.recipientCount : null;
	}

	get issuerBadgeCount() {
		// Load the list if it's not present
		// this.badgeManager.badgesByIssuerUrl.loadedPromise;

		const badges = this.badgeManager.badgesByIssuerUrl.lookup(this.issuer.issuerUrl);
		return badges && badges.length;
	}
	readonly issuerImagePlacholderUrl = preloadImageURL(require('../../../../breakdown/static/images/placeholderavatar-issuer.svg'));
	launchpoints: ApiExternalToolLaunchpoint[];

	badgeClassLoaded: Promise<any>;
	badgeInstancesLoaded: Promise<any>;
	assertionsLoaded: Promise<any>;
	issuerLoaded: Promise<any>;
	showAssertionCount: boolean = false;
	badgeClass: BadgeClass;
	allBadgeInstances: BadgeClassInstances;
	instanceResults: BadgeInstance[] = [];
	resultsPerPage = 100;
	issuer: Issuer;

	private _searchQuery: string = "";

	constructor(
		protected title: Title,
		protected messageService: MessageService,
		protected badgeManager: BadgeClassManager,
		protected issuerManager: IssuerManager,
		protected badgeInstanceManager: BadgeInstanceManager,
		sessionService: SessionService,
		router: Router,
		route: ActivatedRoute,
		protected dialogService: CommonDialogsService,
		private eventService: EventsService,
		protected configService: AppConfigService,
		private externalToolsManager: ExternalToolsManager
	) {
		super(router, route, sessionService);

		this.badgeClassLoaded = badgeManager.badgeByIssuerSlugAndSlug(
			this.issuerSlug,
			this.badgeSlug
		).then(
			badge => {
				this.badgeClass = badge;
				this.title.setTitle(`Badge Class - ${this.badgeClass.name} - ${this.configService.theme['serviceName'] || "Badgr"}`);
				this.loadInstances();
			},
			error => this.messageService.reportLoadingError(`Cannot find badge ${this.issuerSlug} / ${this.badgeSlug}`,
				error)
		);


		this.issuerLoaded = issuerManager.issuerBySlug(this.issuerSlug).then(
			issuer => this.issuer = issuer,
			error => this.messageService.reportLoadingError(`Cannot find issuer ${this.issuerSlug}`, error)
		);

		this.externalToolsManager.getToolLaunchpoints("issuer_assertion_action").then(launchpoints => {
			this.launchpoints = launchpoints;
		})
	}

	loadInstances(recipientQuery?: string) {
	  let instances = new BadgeClassInstances(this.badgeInstanceManager, this.issuerSlug, this.badgeSlug, recipientQuery);
		this.badgeInstancesLoaded = instances.loadedPromise
			.then(
				retInstances => {
					this.allBadgeInstances = retInstances;
					this.updateResults();
				},
				error => {
					this.messageService.reportLoadingError(
						`Could not load recipients ${this.issuerSlug} / ${this.badgeSlug}`
					);
					return error
				}
			);
	}

	ngOnInit() {
		super.ngOnInit();
	}

	revokeInstance(
		instance: BadgeInstance
	) {
		this.confirmDialog.openResolveRejectDialog({
			dialogTitle: "Warning",
			dialogBody: `Are you sure you want to revoke <strong>${this.badgeClass.name}</strong> from <strong>${instance.recipientIdentifier}</strong>?`,
			resolveButtonLabel: "Revoke Badge",
			rejectButtonLabel: "Cancel"
		}).then(
			() => {
				instance.revokeBadgeInstance("Manually revoked by Issuer").then(
					(result) => {
						this.messageService.reportMinorSuccess(`Revoked badge to ${instance.recipientIdentifier}`);
						this.badgeClass.update();
						this.updateResults();
					},
					(error) =>
						this.messageService.reportAndThrowError(`Failed to revoke badge to ${instance.recipientIdentifier}`)
				)
			},
			() => void 0 // Cancel
		)
	}

	deleteBadge() {
		if (this.recipientCount === 0) {

			this.confirmDialog.openResolveRejectDialog({
				dialogTitle: "Warning",
				dialogBody: `Are you sure you want to delete the badge <strong>${this.badgeClass.name}</strong>?`,
				resolveButtonLabel: "Delete Badge",
				rejectButtonLabel: "Cancel",
			}).then(() => {

				this.badgeManager.removeBadgeClass(this.badgeClass).then(
					(success) => {
						this.messageService.reportMajorSuccess(`Removed badge class: ${this.badgeClass.name}.`)
						this.router.navigate([ 'issuer/issuers', this.issuerSlug ]);
					},
					(error) => {
						this.messageService.reportAndThrowError(`Failed to delete badge class: ${BadgrApiFailure.from(error).firstMessage}`);
					}
				);

			}, () => void 0);

		} else {

			this.confirmDialog.openResolveRejectDialog({
				dialogTitle: "Error",
				dialogBody: `All instances of <strong>${this.badgeClass.name}</strong> must be revoked before you can delete it`,
				resolveButtonLabel: "Ok",
				showRejectButton: false
			}).then(() => void 0, () => void 0)

		}
	}

	shareInstance(instance: BadgeInstance) {
		this.dialogService.shareSocialDialog.openDialog(this.badgeShareDialogOptionsFor(instance));
	}

	badgeShareDialogOptionsFor(badge: BadgeInstance): ShareSocialDialogOptions {
		return badgeShareDialogOptions({
			shareUrl: badge.instanceUrl,
			imageUrl: badge.imagePreview,
			badgeClassName: this.badgeClass.name,
			badgeClassDescription: this.badgeClass.description,
			issueDate: badge.issuedOn,
			recipientName: badge.getExtension('extensions:recipientProfile', {'name': undefined}).name,
			recipientIdentifier: badge.recipientIdentifier,
			recipientType: badge.recipientType
		});
	}

	private updateResults() {
		this.instanceResults = this.allBadgeInstances.entities;
		if (this.recipientCount > this.resultsPerPage) {
			this.showAssertionCount = true;
		}
	}

	private hasNextPage() {
		return this.allBadgeInstances.lastPaginationResult && this.allBadgeInstances.lastPaginationResult.nextUrl;
	}
	private hasPrevPage() {
		return this.allBadgeInstances.lastPaginationResult && this.allBadgeInstances.lastPaginationResult.prevUrl;
	}

	private clickNextPage() {
		if (this.hasNextPage()) {
			this.showAssertionCount = false;
			this.assertionsLoaded = this.allBadgeInstances.loadNextPage().then(() => this.showAssertionCount = true)
		}
	}

	private clickPrevPage() {
		if (this.hasPrevPage()) {
			this.showAssertionCount = false;
			this.assertionsLoaded = this.allBadgeInstances.loadPrevPage().then(() => this.showAssertionCount = true);
		}
	}

	private clickLaunchpoint(launchpoint: ApiExternalToolLaunchpoint, instanceSlug: BadgeInstanceSlug) {
		this.externalToolsManager.getLaunchInfo(launchpoint, instanceSlug).then(launchInfo => {
			this.eventService.externalToolLaunch.next(launchInfo );
		})
	}
}


class MatchingAlgorithm {
	static instanceMatcher(inputPattern: string): (instance: BadgeInstance) => boolean {
		let patternStr = StringMatchingUtil.normalizeString(inputPattern);
		let patternExp = StringMatchingUtil.tryRegExp(patternStr);

		return instance => (
			StringMatchingUtil.stringMatches(instance.recipientIdentifier, patternStr, patternExp)
		)
	}
}

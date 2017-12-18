import { Injectable } from "@angular/core";

/**
 * Service to manage the initial loading indicator, allowing customizations to when it is hidden.
 */
@Injectable()
export class InitialLoadingIndicatorService {
	private _initialLoadedPromise: Promise<any>;

	get initialLoadedPromise() {
		return this._initialLoadedPromise
	}

	set initialLoadedPromise(
		promise: Promise<any>
	) {
		const thisPromise = this._initialLoadedPromise = promise.then(() => {
			// Only hide the indicator if this promise is the most recent one set
			if (this._initialLoadedPromise == thisPromise) {
				this.hideIndicator();
			}
		});
	}

	constructor() {
		// The default behavior is to hide the loading message as soon as angular is ready. Here, by using setTimeout, we're
		// scheduling that for the next angular cycle. If something sets a new promise before the next cycle, however, it
		// will preempt this default.
		this.initialLoadedPromise = new Promise(resolve => setTimeout(resolve));
	}

	private hideIndicator() {
		const indicatorElem = document.getElementById("initial-loading-indicator");
		if (indicatorElem) {
			indicatorElem.style.display = "none"
		}
	}
}

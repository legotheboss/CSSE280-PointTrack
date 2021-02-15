var rhit = rhit || {};

rhit.FB_COLLECTION_RewardAccount = "pointtrack";
rhit.FB_KEY_LAST_UPDATED = "reward_history";
rhit.FB_KEY_CUR_BALANCE = "current_balance";
rhit.FB_KEY_CARD = "accountType";
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_BALANCE_HISTORY = "point_history";
rhit.KEY_UID = "uid";
rhit.fbRewardAccountsManager = null;
rhit.fbSingleAccountManager = null;
rhit.fbAuthManager = null;

const accountEnums = Object.freeze({"amexMR":"American Express Membership Rewards", "citiTYP":"Citi ThankYou Rewards", "chaseUMR":"Chase Ultimate Rewards", "boaPR":"Bank of America Premier Rewards", "discoverCR":"Discover Card Rewards"});

// From: https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.ListPageController = class {
	constructor() {
		document.querySelector("#menuShowMyQuotes").addEventListener("click", (event) => {
			//console.log("Show only my quotes");
			window.location.href = `/home.html?uid=${rhit.fbAuthManager.uid}`;
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			//console.log("Sign out");
			rhit.fbAuthManager.signOut();
		});

		// document.querySelector("#submitAddQuote").onclick = (event) => {
		// };
		document.querySelector("#submitAddQuote").addEventListener("click", (event) => {
			const quote = document.querySelector('#start').valueAsDate;
			const movie = document.querySelector("#inputMovie").value;
			const cardAccount = document.querySelector("#account-type").selectedOptions[0].value;
			rhit.fbRewardAccountsManager.add(quote, movie, cardAccount);
		});

		

		$("#addQuoteDialog").on("show.bs.modal", (event) => {
			// Pre animation
			//document.querySelector("#inputQuote").value = "";
			document.querySelector("#inputMovie").value = "";
		});
		$("#addQuoteDialog").on("shown.bs.modal", (event) => {
			// Post animation
			//document.querySelector("#inputQuote").focus();
		});

		// Start listening!
		rhit.fbRewardAccountsManager.beginListening(this.updateList.bind(this));

	}


	updateList() {

		document.querySelector("#nameBadge").innerHTML = `Welcome, ${rhit.fbAuthManager._user.displayName}!`;

		console.log("I need to update the list on the page!");
		console.log(`Num quotes = ${rhit.fbRewardAccountsManager.length}`);
		console.log("Example quote = ", rhit.fbRewardAccountsManager.getRewardAccountAtIndex(0));

		// Make a new quoteListContainer
		const newList = htmlToElement('<div id="quoteListContainer"></div>');
		// Fill the quoteListContainer with quote cards using a loop
		for (let i = 0; i < rhit.fbRewardAccountsManager.length; i++) {
			const mq = rhit.fbRewardAccountsManager.getRewardAccountAtIndex(i);
			const newCard = this._createCard(mq);
			newCard.onclick = (event) => {
				//console.log(`You clicked on ${mq.id}`);
				// rhit.storage.setRewardAccountId(mq.id);
				window.location.href = `/RewardAccount.html?id=${mq.id}`;
			};
			newList.appendChild(newCard);
		}


		// Remove the old quoteListContainer
		const oldList = document.querySelector("#quoteListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		// Put in the new quoteListContainer
		oldList.parentElement.appendChild(newList);
	}

	_createCard(RewardAccount) {
		return htmlToElement(`<div class="card">
		<div class="card-body">
			<h5 class="card-title">${eval("accountEnums."+RewardAccount.accountType)}</h5>
			<h6 class="card-subtitle mb-2 text-muted">${RewardAccount.movie}</h6>
			<h6 class="card-subtitle mb-2 text-muted">Last Updated: ${RewardAccount.quote}</h6>
		</div>
	</div>`);
	}

}

rhit.RewardAccount = class {
	constructor(id, quote, movie, accountType) {
		this.id = id;
		this.quote = quote;
		this.movie = movie;
		this.accountType = accountType;
	}
}

rhit.FbRewardAccountsManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_RewardAccount);
		this._unsubscribe = null;
	}

	add(quote, movie, cardAccount) {
		// Add a new document with a generated id.
		this._ref.add({
				[rhit.FB_KEY_LAST_UPDATED]: quote,
				[rhit.FB_KEY_CUR_BALANCE]: movie,
				[rhit.FB_KEY_CARD]: cardAccount,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
				[rhit.KEY_UID]: rhit.fbAuthManager.uid,
			})
			.then(function (docRef) {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	beginListening(changeListener) {

		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		if (this._uid) {
			query = query.where(rhit.KEY_UID, "==", this._uid);
		}

		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			console.log("RewardAccount update!");
			this._documentSnapshots = querySnapshot.docs;
			// querySnapshot.forEach((doc) => {
			// 	console.log(doc.data());
			// });
			changeListener();
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	// update(id, quote, movie) {}
	// delete(id) {}
	get length() {
		return this._documentSnapshots.length;
	}

	getRewardAccountAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const mq = new rhit.RewardAccount(docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_LAST_UPDATED),
			docSnapshot.get(rhit.FB_KEY_CUR_BALANCE),
			docSnapshot.get(rhit.FB_KEY_CARD));
		return mq;
	}
}

rhit.DetailPageController = class {
	constructor() {
		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("Sign out");
			rhit.fbAuthManager.signOut();
		});
		document.querySelector("#submitEditQuote").addEventListener("click", (event) => {
			//const quote = document.querySelector("#inputQuote").value;
			const movie = document.querySelector("#inputMovie").value;
			rhit.fbSingleAccountManager.update(quote, movie);
		});

		$("#editQuoteDialog").on("show.bs.modal", (event) => {
			// Pre animation
			//document.querySelector("#inputQuote").value = rhit.fbSingleAccountManager.quote;
			document.querySelector("#inputMovie").value = rhit.fbSingleAccountManager.movie;
		});
		$("#editQuoteDialog").on("shown.bs.modal", (event) => {
			// Post animation
			document.querySelector("#inputQuote").focus();
		});

		document.querySelector("#submitDeleteQuote").addEventListener("click", (event) => {
			rhit.fbSingleAccountManager.delete().then(function () {
				console.log("Document successfully deleted!");
				window.location.href = "/home.html";
			}).catch(function (error) {
				console.error("Error removing document: ", error);
			});
		});

		rhit.fbSingleAccountManager.beginListening(this.updateView.bind(this));
	}
	updateView() {
		document.querySelector("#cardQuote").innerHTML = rhit.fbSingleAccountManager.quote;
		document.querySelector("#cardMovie").innerHTML = rhit.fbSingleAccountManager.movie;
		if (rhit.fbSingleAccountManager.uid == rhit.fbAuthManager.uid) {
			document.querySelector("#menuEdit").style.display = "flex";
			document.querySelector("#menuDelete").style.display = "flex";
		}
	}
}

rhit.FbSingleAccountManager = class {
	constructor(RewardAccountId) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_RewardAccount).doc(RewardAccountId);
	}

	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				changeListener();
			} else {
				// doc.data() will be undefined in this case
				console.log("No such document!");
				//window.location.href = "/";
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	update(quote, movie, cardAccount) {
		this._ref.update({
				[rhit.FB_KEY_LAST_UPDATED]: quote,
				[rhit.FB_KEY_CUR_BALANCE]: movie,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
				[rhit.FB_KEY_CARD]: cardAccount
			})
			.then(() => {
				console.log("Document successfully updated!");
			})
			.catch(function (error) {
				// The document probably doesn't exist.
				console.error("Error updating document: ", error);
			});
	}

	delete() {
		return this._ref.delete();
	}

	get quote() {
		return this._documentSnapshot.get(rhit.FB_KEY_LAST_UPDATED);
	}

	get movie() {
		return this._documentSnapshot.get(rhit.FB_KEY_CUR_BALANCE);
	}

	get uid() {
		return this._documentSnapshot.get(rhit.KEY_UID);
	}

	get cardAccount() {
		return this._documentSnapshot.get(rhit.FB_KEY_CARD);
	}

}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	signIn() {
		Rosefire.signIn("928eef67-79af-42e1-9413-f09476bec053", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);

			// Next use the Rosefire token with Firebase auth.
			firebase.auth().signInWithCustomToken(rfUser.token).catch((error) => {
				if (error.code === 'auth/invalid-custom-token') {
					console.log("The token you provided is not valid.");
				} else {
					console.log("signInWithCustomToken error", error.message);
				}
			});
		});


	}
	signOut() {
		firebase.auth().signOut();
	}
	get uid() {
		return this._user.uid;
	}
	get isSignedIn() {
		return !!this._user;
	}
}

rhit.LoginPageController = class {
	constructor() {
		document.querySelector("#rosefireButton").onclick = (event) => {
			rhit.fbAuthManager.signIn();
		};
	}
}

rhit.checkForRedirects = function () {
	// Redirects
	if (document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/home.html";
	}
	if (!document.querySelector("#loginPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/";
	}
}


rhit.initializePage = function () {
	// Initialization
	if (document.querySelector("#listPage")) {
		console.log("You are on the list page.");
		const uid = rhit.fbAuthManager.uid;
		console.log("url parameter = ", uid);

		rhit.fbRewardAccountsManager = new rhit.FbRewardAccountsManager(uid);
		new rhit.ListPageController();
	}
	if (document.querySelector("#detailPage")) {
		console.log("You are on the detail page.");
		//const RewardAccountId = rhit.storage.getRewardAccountId();

		const queryString = window.location.search;
		console.log(queryString);
		const urlParams = new URLSearchParams(queryString);
		const RewardAccountId = urlParams.get("id");

		if (!RewardAccountId) {
			window.location.href = "/";
		}
		rhit.fbSingleAccountManager = new rhit.FbSingleAccountManager(RewardAccountId);
		new rhit.DetailPageController();
	}

	if (document.querySelector("#loginPage")) {
		console.log("On the login page");
		new rhit.LoginPageController();
	}
}


/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log(`The auth state has changed.   isSignedIn = ${rhit.fbAuthManager.isSignedIn}`);
		rhit.checkForRedirects();
		rhit.initializePage();
	});

	rhit.startFireBaseUI();
};

rhit.startFireBaseUI = function() {
	var uiConfig = {
        signInSuccessUrl: '/',
        signInOptions: [
			firebase.auth.GoogleAuthProvider.PROVIDER_ID,
		],
	};
    const ui = new firebaseui.auth.AuthUI(firebase.auth());
	ui.start('#loginButtons', uiConfig);
};


rhit.main();
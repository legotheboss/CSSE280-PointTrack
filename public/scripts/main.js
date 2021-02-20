var rhit = rhit || {};

rhit.FB_COLLECTION_RewardAccount = "pointtrack";
rhit.FB_COLLECTION_PointHistory = "point_history";
rhit.FB_KEY_LAST_UPDATED = "reward_history";
rhit.FB_KEY_CUR_BALANCE = "current_balance";
rhit.FB_KEY_CARD = "accountType";
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_POINTHISTORY_DATE = "timestamp";
rhit.FB_KEY_POINTHISTORY_BALANCE = "balance"
rhit.KEY_UID = "uid";
rhit.fbRewardAccountsManager = null;
rhit.fbSingleAccountManager = null;
rhit.fbAuthManager = null;
rhit.fbCashValue = null;
rhit.chart = null;

const accountEnums = Object.freeze({"amexMR":"American Express Rewards", "citiTYP":"Citi ThankYou", "chaseUMR":"Chase Ultimate Rewards", "boaPR":"Bank of America Premier Rewards", "discoverCR":"Discover Card Rewards"});

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
			document.querySelector("#inputMovie").focus();
		});

		// Start listening!
		rhit.fbRewardAccountsManager.beginListening(this.updateList.bind(this));
	}

	updateList() {
		if(rhit.fbAuthManager._user.displayName){
			var title_text = `Welcome, ${rhit.fbAuthManager._user.displayName}!`;
		} else {
			var title_text = "Welcome!"
		}
		document.querySelector("#nameBadge").innerHTML = title_text;
		

		console.log("I need to update the list on the page!");
		console.log(`Num quotes = ${rhit.fbRewardAccountsManager.length}`);

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
			<h5 class="card-title" style="font-size: large;">${eval("accountEnums."+RewardAccount.accountType)}</h5>
			<h6 class="card-subtitle mb-2 text-muted" style="font-size: medium;">${RewardAccount.current_bal} points</h6>
			<h6 class="card-subtitle mb-2 text-muted" style="font-size: medium;">Last Updated: ${RewardAccount.last_updated.toDate().toLocaleDateString(
				'en-us')}</h6>
		</div>
	</div>`);
	}

}

rhit.RewardAccount = class {
	constructor(id, last_updated, current_bal, accountType) {
		this.id = id;
		this.last_updated = last_updated;
		this.current_bal = current_bal;
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

	add(last_updated, cur_balance, cardAccount) {
		// Add a new document with a generated id.
		this._ref.add({
				[rhit.FB_KEY_LAST_UPDATED]: last_updated,
				[rhit.FB_KEY_CUR_BALANCE]: cur_balance,
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
			changeListener();
		});
	}

	stopListening() {
		this._unsubscribe();
	}

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
			const balance = document.querySelector("#inputBalance").value;
			const date = document.querySelector('#start').valueAsDate;
			rhit.fbSingleAccountManager.addDatapoint(date, balance);
		});

		document.querySelector("#menuShowMyQuotes").addEventListener("click", (event) => {
			window.location.href = `/home.html`;
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			//console.log("Sign out");
			rhit.fbAuthManager.signOut();
		});

		$("#editQuoteDialog").on("shown.bs.modal", (event) => {
			// Post animation
			document.querySelector("#inputBalance").focus();
		});

		document.querySelector("#submitDeleteQuote").addEventListener("click", (event) => {
			rhit.fbSingleAccountManager.delete().then(function () {
				console.log("Document successfully deleted!");
				window.location.href = "/home.html";
			}).catch(function (error) {
				console.error("Error removing document: ", error);
			});
		});

		var ctx = document.getElementById('myChart').getContext('2d');
		Chart.defaults.global.defaultFontColor='white';
		rhit.chart = new Chart(ctx, {
			// The type of chart we want to create
			type: 'line',
		
			// The data for our dataset
			data: {
				//labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
				datasets: [{
					backgroundColor: 'rgb(220, 220, 220)',
					borderColor: 'rgb(255, 255, 255)',
					data: [{
						x: new Date().setDate(15),
						y: 1
					}, {
						t: new Date().setDate(16),
						y: 5
					}, {
						t: new Date().setDate(17),
						y: 10
					}],
				}]
			},

			options: {
				legend: {
					display: false
				},
				layout: {
					padding: {
						left: 0,
						right: 0,
						top: 5,
						bottom: 5
					}
				},
				scales: {
					xAxes: [{
						gridLines: {
							display:false
						},
						type: 'time',
						time: {
							unit: 'day'
						}
					}],
					yAxes: [{
						gridLines: {
							display:false
						},
						display: false   
					}]
				}
			}
		
			// Configuration options go here
		});
		rhit.fbSingleAccountManager.beginListening(this.updateView.bind(this));
		rhit.fbCashValue.beginListening(this.updateView.bind(this));
	}
	updateView() {
		let account = rhit.fbSingleAccountManager.cardAccount;
		document.querySelector("#cardQuote").innerHTML =  eval("accountEnums."+account);
		document.querySelector("#cardMovie").innerHTML = rhit.fbSingleAccountManager.cur_balance+" Points";
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
		this._point_balance_ref = this._ref.collection(rhit.FB_COLLECTION_PointHistory);
		this.point_history = [];
		this.redemption_methods = [];
	}

	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				firebase.firestore().collection("redemptions").doc(this.cardAccount).get().then(
					(docu) => {
						this.redemption_methods = docu.data();
					}
				)
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

	update(last_updated, cur_balance, cardAccount) {
		this._ref.update({
				[rhit.FB_KEY_LAST_UPDATED]: last_updated,
				[rhit.FB_KEY_CUR_BALANCE]: cur_balance,
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

	addDatapoint(date, balance) {
		// Add a new document with a generated id.
		this._point_balance_ref.add({
				[rhit.FB_KEY_POINTHISTORY_BALANCE]: parseInt(balance),
				[rhit.FB_KEY_POINTHISTORY_DATE]: date,
			})
			.then(function (docRef) {
				console.log("Subcollection added with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
		
		this._ref.update({
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		})
		.then(() => {
			console.log("Document successfully updated!");
		})
		.catch(function (error) {
			// The document probably doesn't exist.
			console.error("Error updating document: ", error);
		});
	}

	async updatePointHistory() {
		const snapshot = await this._point_balance_ref.get();
		this.point_history = snapshot.docs.map(doc => doc.data());
		return this.point_history[0];
	}

	delete() {
		return this._ref.delete();
	}

	get last_updated() {
		return this._documentSnapshot.get(rhit.FB_KEY_LAST_UPDATED);
	}

	get cur_balance() {
		return this._documentSnapshot.get(rhit.FB_KEY_CUR_BALANCE);
	}

	get uid() {
		return this._documentSnapshot.get(rhit.KEY_UID);
	}

	get cardAccount() {
		return this._documentSnapshot.get(rhit.FB_KEY_CARD);
	}
}

rhit.FbCashValue = class {
	constructor() {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection("cash_value").doc("current");
	}

	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				const cash_equivalent = rhit.fbCashValue.getValue(rhit.fbSingleAccountManager.cardAccount)* rhit.fbSingleAccountManager.cur_balance;
				document.querySelector("#cashValue").innerHTML = "$" + cash_equivalent.toFixed(2);
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

	getValue(accountType) {
		return this._documentSnapshot.get("values")[accountType];
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
		rhit.fbCashValue = new rhit.FbCashValue();
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
    if(document.querySelector("#loginPage")) {
		const ui = new firebaseui.auth.AuthUI(firebase.auth());
		ui.start('#loginButtons', uiConfig);
	}
};


rhit.main();
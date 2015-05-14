// to do: remove cache when profile is successfully added. probably need to do the same for removing a profile in settings.

( function( $, tester, undefined ) {
	var t = ( tester ) ? tester.networkConnect = {} : {};

	t.setup = function() {
		var connect = Ss.networkConnect = {
			collections : {
				groupProfiles : Backbone.Collection.extend( t.groupProfilesCollectionCore )
			},
			models : {
				groupProfile : Backbone.Model.extend( t.groupProfileModelCore )
			},
			views : {
				groupProfileConnectModal : Backbone.View.extend( t.groupProfileConnectModalViewCore ),
				connectModalDescriptionBox : Backbone.View.extend( t.connectModalDescriptionBoxViewCore )
			},
			app : {},
			setup : t.setup,
			init : t.init,
			teardown : t.teardown
		};
		Ss.info( 'networkConnect::setup' );

		Ss.network_connect = t.oldNetworkConnect;
	};

	t.init = function() {
		var connect = Ss.networkConnect;
		Ss.info( 'networkConnect::init' );

		connect.init = t.initModalFor;
		connect.app.initSelect = t.initSelect;
		connect.app.modalRouter = t.modalRouter;
		connect.app.handleProfileConnectSelect = t.handleProfileConnectSelect;
		connect.app.handleProfileConnectSuccess = t.handleProfileConnectSuccess;

		connect.app.restrictedProfiles = [ 'twitter', 'facebook', 'linkedin', 'gplus' ];

		connect.app.selected = {
			facebookType : 'page',
			action : 'add',
			profileType : null,
			profileData : null
		};
		connect.app.groupProfilesCollection = new connect.collections.groupProfiles( _.where( Ss.groups, { is_personal : false } ) ); // each group needs to have separate data for connecting profiles. Hence, we use a collection of models initialized with data from the groups call.
		connect.app.groupProfileConnectModalView = new connect.views.groupProfileConnectModal( { collection : connect.app.groupProfilesCollection } ); // view is always enabled in the background.
		connect.app.connectModalDescriptionBoxView = new connect.views.connectModalDescriptionBox();

		// someday, we'll remove Ss.network_connect
		_.bindAll( Ss.network_connect.groupCreate );
		_.bindAll( Ss.network_connect.facebookConnect );
	};

	t.initSelect = function() { // used to initiate the model and views for the profile select state
		var connect = Ss.networkConnect;
		Ss.info( 'networkConnect::initSelect' );

		connect.models.profileSelect = Backbone.Model.extend( t.profileSelectModelCore );
		connect.views.profileSelect = Backbone.View.extend( t.profileSelectViewCore );
		connect.collections.profileSelect = Backbone.Collection.extend( t.profileSelectCollectionCore );

		connect.app.profileSelectCollection = new connect.collections.profileSelect();
		connect.app.parseFacebookPageDataForGroup = t.parseFacebookPageDataForGroup;
		connect.app.parseGoogleAnalyticsDataForGroup = t.parseGoogleAnalyticsDataForGroup;
		connect.app.parseGooglePlusDataForGroup = t.parseGooglePlusDataForGroup;
		connect.app.profileSelectModalView = new ( Backbone.View.extend( t.profileSelectModalViewCore ) )( { collection : connect.app.groupProfilesCollection } );
	};

	t.teardown = function() {
		var connect = Ss.networkConnect;
		Ss.info( 'networkConnect::teardown' );

		connect.app.selected = undefined;
		connect.app.parseFacebookPageDataForGroup = undefined;
		connect.app.parseGoogleAnalyticsDataForGroup = undefined;
		connect.app.modalRouter = undefined;
		connect.app.handleProfileConnectSelect = undefined;
		connect.app.handleProfileConnectSuccess = undefined;
		connect.app.initSelect = undefined;

		connect.app.connectModalDescriptionBoxView.teardown();
		connect.app.connectModalDescriptionBoxView = undefined;
		connect.views.connectModalDescriptionBox = undefined;

		if ( connect.app.profileSelectModalView ) {
			connect.app.profileSelectModalView.teardown();
		}

		connect.collections.profileSelect = undefined;
		connect.models.profileSelect = undefined;
		connect.views.profileSelect = undefined;

		connect.app.groupProfileConnectModalView.teardown();
		connect.app.groupProfileConnectModalView = undefined;
		connect.app.groupProfilesCollection = undefined;
		connect.collections.groupProfiles = undefined;
		connect.models.groupProfile = undefined;
		connect.views.groupProfileConnectModal = undefined;

		connect.views = connect.models = connect.collections = undefined;
	};

	/*
	 * This is intended to generate the URL endpoint to redirect to when creating various networks for an EXISTING group (this will not work with a new group).
	 *
	 * Both groupId and type are required parameters.
	 */
	t.generateConnectUrl = function(groupId, type) {
		var connectUrls = {
				twitter : '/oauthhandler/twitterOauth/' + groupId + '/',
				twitterpersonal : '/oauthhandler/personalModalTwitterOauth/' + groupId + '/',
				facebookprofile : '/oauthhandler/fbOauth/' + groupId + "/profile/",
				facebookpersonal : '/oauthhandler/personalModalFbOauth/' + groupId + '/',
				facebookfanpage : '/oauthhandler/fbOauth/' + groupId + "/fan/",
				googleplus : '/oauthhandler/googlePlusOauth/' + groupId + '/',
				linkedin : '/oauthhandler/linkedinOauth/' + groupId + '/',
				linkedinpersonal : '/oauthhandler/personalModalLinkedinOauth/' + groupId + '/',
				ganalytics : '/oauthhandler/googleOauth/' + groupId + '/',
				rssreader : '/oauthhandler/feedlyOauth/',
				bitly : '/oauthhandler/bitlyOauth/' + groupId + '/',
				gplus : 'oauthhandler/googlePlusOauth/' + groupId + '/'
			};
		Ss.info( 'generateConnectUrl', arguments );
		if (!groupId || !type) { return null; }

		if ( type ) {
			type = type.toLowerCase();
		}

		return connectUrls[ type ];
	};

	// this initiates the modal. alias'd as Ss.networkConnect.init() to the rest of the webapp.
	// extraProfileVars can be either:
	//     [ networkIds ] which is required for the success state, OR
	//     { data:object, isNewGroup:boolean } for facebook pages
	t.initModalFor = function( groupId, profileType, action, extraProfileVars ) {
		var selected = Ss.networkConnect.app.selected,
			facebookTypes = [ 'facebook_page', 'facebook', 'facebook_profile' ];
		Ss.info( 'networkConnect::initModalFor' );

		selected.action = action || 'add';
		selected.facebookType = ( profileType !== 'facebook_profile' ) ? 'page' : 'profile';
		selected.profileType = ( $.inArray( profileType, facebookTypes ) > -1 ) ? 'facebook' : profileType; // presets the selected Profile type. must be one of [ 'twitter', 'facebook', 'facebook_page', 'facebook_profile', 'linkedin', 'gplus', 'google_analytics_website', 'rssreader' ].

		Ss.networkConnect.app.modalRouter( groupId, extraProfileVars );
	};

	t.modalRouter = function( groupId, extraProfileVars ) { // selects which modal to load (selection vs add/success modal)
		var app = Ss.networkConnect.app,
			group = app.groupProfilesCollection.where( { id : groupId } )[ 0 ];

		if ( app.selected.action === 'select' ) {
			group = app.handleProfileConnectSelect( groupId, extraProfileVars, group );
		} else {
			if ( app.selected.action === 'success' ) {
				app.handleProfileConnectSuccess( group, extraProfileVars );
			} else {
				app.selected.profileData = undefined;
			}

			group.getData();
		}

		group.
			set( 'selected', true, { silent : true } ).
			trigger( 'change:selected', group ); // will cause modals to render even when our group is already selected (as is usually the case)
	};

	t.handleProfileConnectSelect = function( groupId, extraProfileVars, group ) {
		var app = Ss.networkConnect.app;

		app.initSelect();

		if ( extraProfileVars.isNewGroup ) {
			group = new Ss.networkConnect.models.groupProfile( { id : groupId, customer : { id : Ss.user.customerId } } );
			app.groupProfilesCollection.add( group );
		}

		if( app.selected.profileType === 'facebook' && app.selected.facebookType === 'page' ) {
			app.parseFacebookPageDataForGroup( group, extraProfileVars );
		} else if ( app.selected.profileType === 'google_analytics_website' ) {
			app.parseGoogleAnalyticsDataForGroup( group, extraProfileVars );
		} else if ( app.selected.profileType === 'gplus' ) {
			app.parseGooglePlusDataForGroup( group, extraProfileVars );
		}

		return group;
	};

	t.handleProfileConnectSuccess = function( group, extraProfileVars ) {
		var app = Ss.networkConnect.app,
			profileData;

		group.resetData();

		if ( app.selected.profileType !== 'rssreader' ) {
			profileData = _.filter( group.get( 'networks' ), function( profile ) {
				return $.inArray( profile.id, extraProfileVars ) > -1;
			} );
			app.selected.profileData = { numProfiles : profileData.length };

			if (
					( app.selected.profileType === 'facebook' && app.selected.facebookType === 'page' ) ||
					app.selected.profileType === 'gplus'
			) {
				$.extend( app.selected.profileData, profileData[ 0 ] );
			} else {
				app.selected.profileData.data = profileData;
			}
		}
	};

	t.parseGoogleAnalyticsDataForGroup = function( group, data ) {
		var models = [],
			groupId = group.get( 'id' );
		Ss.info( 'networkConnect::parseGoogleAnalyticsDataForGroup', arguments );

		data.CSRF_CODE = Ss.csrf;

		Ss.networkConnect.app.profileSelectCollection.closeUrl = '/settings/accounts/group/' + groupId + '/';

		_.forEach( data.ga_websites, function( gaSite ) {
			models.push( {
				id : gaSite.id,
				connected : gaSite.is_already_connected,
				name : gaSite.title
			} );
		} );

		Ss.networkConnect.app.selected.profileData = data;
		group.set( 'selected', true );
		Ss.networkConnect.app.profileSelectCollection.reset( models );
	};

	t.parseFacebookPageDataForGroup = function( group, pageVars ) {
		var models = [],
			groupId = group.get( 'id' );
		Ss.info( 'networkConnect::parseFacebookPageDataForGroup', arguments );

		Ss.networkConnect.app.profileSelectCollection.closeUrl = pageVars.isNewGroup ?
			'/oauthhandler/handleFbNoConnect/'+ groupId +'/' :
			'/settings/accounts/group/' + groupId + '/';

		// if there was not a new group but the user was TRYING to make a new group, then we don't
		// want the back button to take the user to the profile select modal
		Ss.networkConnect.app.profileSelectCollection.showProfileSelectModal = !pageVars.createNewGroup;

		group.set( 'numProfilesAvailable', pageVars.data.num_available );

		_.forEach( pageVars.data.fb_pages, function( page ) {
			models.push( {
				id : page.id,
				name : page.name,
				img : '//graph.facebook.com/'+ page.id +'/picture',
				connected : page.is_already_connected,
				vanity_url: page.vanity_url
			} );
		} );

		Ss.networkConnect.app.selected.profileData = pageVars;
		group.set( 'selected', true );
		Ss.networkConnect.app.profileSelectCollection.reset( models );
	};

	t.parseGooglePlusDataForGroup = function( group, pageVars ) {
		var models = [],
			groupId = group.get( 'id' );

		Ss.networkConnect.app.profileSelectCollection.closeUrl = '/settings/accounts/group/' + groupId + '/';

		group.set( 'numProfilesAvailable', pageVars.data.num_available );

		_.forEach( pageVars.data.gplus_pages, function( page ) {
			models.push( {
				id : page.id,
				name : page.name,
				img : page.image,
				connected : page.is_already_connected
			} );
		} );

		Ss.networkConnect.app.selected.profileData = pageVars;
		group.set( 'selected', true );
		Ss.networkConnect.app.profileSelectCollection.reset( models );
	};

	t.profileSelectCollectionCore = {
		initialize : function() {
			Ss.info( 'profileSelectCollection::initialize' );
			_.bindAll( this );
			this.model = Ss.networkConnect.models.profileSelect;
		},

		comparator : function( m1, m2 ) { // sort by connected, then name
			var c1 = m1.get( 'connected' ),
				c2 = m2.get( 'connected' ),
				n1 = m1.get( 'name' ),
				n2 = m2.get( 'name' );

			if ( c1 && !c2 ) {
				return -1;
			} else if ( !c1 && c2 ) {
				return 1;
			} else if ( n1 < n2 ) {
				return -1;
			} else if ( n1 > n2 ) {
				return 1;
			}

			return 0;
		},

		renderCollection : function() {
			var i = 0;
			Ss.info( 'profileSelectCollection::renderCollection' );

			for ( i; i < this.length; i++ ) {
				this.models[ i ].trigger( 'render' );
			}
		}
	};

	t.profileSelectModelCore = {
		defaults : {
			selected : false,
			name : null,
			id : null,
			img : null,
			connected : false,
			vanity_url: null
		},

		initialize : function() {
			Ss.info( 'profileSelectModel::initialize' );
			_.bindAll( this );

			new Ss.networkConnect.views.profileSelect( { model : this } );
		},

		teardown : function() {
			Ss.info( 'profileSelectModel::teardown' );
			this.trigger( 'teardown' );
			this.off();

			return this;
		}
	};

	t.profileSelectViewCore = {
		tagName : 'li',
		className : 'profile-select-profile third',
		events : {
			'click' : 'toggleSelect'
		},

		initialize : function() {
			Ss.info( 'profileSelectView::initialize' );
			_.bindAll( this );

			this.model.on( 'teardown', this.teardown );
			this.model.on( 'change:selected', this.render );
			this.model.on( 'render', this.render );
		},

		render : function() {
			var stache = this.model.toJSON();
			Ss.info( 'profileSelectView::render' );

			stache[ Ss.networkConnect.app.selected.profileType ] = true;

			this.$el.empty().append( Ss.template( 'components_profile_select_profile' )( stache ) );

			this.$el[
				stache.connected ? 'addClass' : 'removeClass'
			]( 'disabled' );

			this.$el.attr( 'title', (!Ss.user.entitlements.use_vanity_url) ? stache.name : stache.vanity_url || stache.name );

			if ( this.$el.parent().length === 0 ) {
				this.$el.appendTo( Ss.networkConnect.app.profileSelectModalView.$el.find( '#profile-select-profiles' ) );
			}

			return this;
		},

		toggleSelect : function( ev ) {
			var selectedProfiles = this.model.collection.where( { selected : true } ),
				currentlyAvailable = Ss.networkConnect.app.profileSelectModalView.getNumberCurrentlyAvailableProfiles( selectedProfiles ),
				isSelected = this.model.get( 'selected' );
			Ss.info( 'profileSelectView::toggleSelect' );
			ev.preventDefault();

			if ( !this.model.get( 'connected' ) ) {
				if (
						currentlyAvailable === false ||
						currentlyAvailable > 0 ||
						( currentlyAvailable === 0 && isSelected )
				) {
					this.model.set( 'selected', !isSelected );
				} else {
					Ss.networkConnect.app.profileSelectModalView.errorFooterMessage();
				}
			}

			return false;
		},

		teardown : function() {
			Ss.info( 'profileSelectView::teardown' );
			this.off();
			this.remove();

			return this;
		}
	};

	t.profileSelectModalViewCore = {
		className : 'proxima',

		events : {
			'click .profile-connect-cancel' : 'close',
			'click .profile-select-back-link' : 'back',
			'click .profile-connect-proceed' : 'connectProfiles'
		},

		initialize : function() {
			Ss.info( 'profileSelectModalView::initialize' );
			_.bindAll( this );

			Ss.networkConnect.app.profileSelectCollection.on( 'reset', this.render );
			Ss.networkConnect.app.profileSelectCollection.on( 'change:selected', this.update );
		},

		render : function() {
			var profileData = Ss.networkConnect.app.profileData,
				selectedGroup = this.collection.find( function( group ) { return group.get( 'selected' ); } ),
				stache;
			Ss.info( 'profileSelectModalView::render' );

			if ( Ss.networkConnect.app.selected.action === 'select' ) {
				stache = selectedGroup.toJSON();
				stache[ Ss.networkConnect.app.selected.profileType ] = true;
				stache.CSRF_CODE = Ss.csrf;
				stache.use_vanity_url = Ss.user.entitlements.use_vanity_url;

				if ( Ss.networkConnect.app.profileSelectCollection.models.length === 0 ) {
					stache.noProfilesToConnect = true;
					if (typeof Ss.networkConnect.app.selected.profileData.granted_permissions !== 'undefined') {
						stache.grantedPermissions = Ss.networkConnect.app.selected.profileData.granted_permissions;
					} else {
						stache.grantedPermissions = true;
					}
				}

				this.$el.empty().append( Ss.template( 'components_profile_select' )( stache ) );
				Ss.networkConnect.app.profileSelectCollection.renderCollection();

				this.dialogWrap();
			}

			return this;
		},

		update : function( profileModel ) {
			var selectedProfiles = profileModel.collection.where( { selected : true } );
			Ss.info( 'profileSelectModalView::update' );

			this.
				updateButtonDisplay( selectedProfiles ).
				updateNumProfiles( selectedProfiles );

			return this;
		},

		updateButtonDisplay : function( selectedProfiles ) {
			Ss.info( 'profileSelectModalView::updateButtonDisplay' );

			this.$el.find( '.profile-connect-proceed' )[
				selectedProfiles.length > 0 ? 'removeClass' : 'addClass'
			]( 'disabled' );

			return this;
		},

		getNumberCurrentlyAvailableProfiles : function( selectedProfiles ) { // returns either an integer or false if total available isn't set.
			var group = this.collection.where( { selected : true } )[ 0 ],
				numProfilesAvailable = group.get( 'numProfilesAvailable' );
			Ss.info( 'profileSelectModalView::getNumberCurrentlyAvailableProfiles' );

			return ( numProfilesAvailable !== undefined ) ? numProfilesAvailable - selectedProfiles.length : false ;
		},

		updateNumProfiles : function( selectedProfiles ) {
			var currentlyAvailable = this.getNumberCurrentlyAvailableProfiles( selectedProfiles );
			Ss.info( 'profileSelectModalView::updateNumProfiles' );

			if ( currentlyAvailable !== false ) {
				this.$el.find( '.profile-connect-numprofiles' ).empty().append( currentlyAvailable );
			}

			return this;
		},

		errorFooterMessage : function() {
			var numEl = this.$el.find( '.profile-connect-footer-msg.numprofiles' ),
				errorEl = this.$el.find( '.profile-connect-footer-msg.numprofiles-error' );
			Ss.info( 'profileSelectModalView::determineShowFooterMessage' );

			numEl.hide();
			errorEl.show();

			setTimeout( function() {
				errorEl.hide();
				numEl.show();
			}, 2200 );

			return this;
		},

		dialogWrap : function() {
			var dialogOptions = { // jqueryUI dialog options
					width : 760,
					position : { my : 'center', at : 'center', of : window, collision : 'fit' },
					resizable : false,
					draggable : false,
					autoOpen : true,
					stack : true,
					modal : true,
					dialogClass : 'profile-connect-dialog puff'
				};
			Ss.info( 'profileSelectModalView::dialogWrap' );

			this.$el.dialog( dialogOptions );
			this.renderDialogOverlay();

			return this;
		},

		renderDialogOverlay : function() {
			var allOverlays = $.ui.dialog.overlay.instances,
				thisDialogOverlay = allOverlays[ allOverlays.length - 1 ];
			Ss.info( 'profileSelectModalView::renderDialogOverlay' );

			thisDialogOverlay.addClass( 'dark_overlay' );

			return this;
		},

		connectProfiles : function( ev ) {
			Ss.info( 'profileSelectModalView::connectProfiles' );
			ev.preventDefault();

			if ( Ss.networkConnect.app.profileSelectCollection.where( { selected : true } ).length > 0 ) {
				if ( Ss.networkConnect.app.selected.profileType === 'facebook' ) {
					this.connectFacebookProfiles();
				} else if ( Ss.networkConnect.app.selected.profileType === 'google_analytics_website' ) {
					this.connectGoogleAnalyticsProfiles();
				} else if ( Ss.networkConnect.app.selected.profileType === 'gplus' ) {
					this.connectGooglePlusPages();
				}

				this.$el.find( '.profile-connect-proceed' ).addClass( 'no-action' );
			}

			return false;
		},

		connectFacebookProfiles : function() {
			var selectedProfileIds = [];
			Ss.info( 'profileSelectModalView::connectFacebookProfiles' );

			Ss.networkConnect.app.profileSelectCollection.each( function( profileModel ) {
				if ( profileModel.get( 'selected' ) ) {
					selectedProfileIds.push( profileModel.get( 'id' ) );
				}
			} );

			this.$el.find( '#facebook-id-str' ).val( selectedProfileIds.join( ',' ) ).
				parent().submit();
		},

		connectGoogleAnalyticsProfiles : function() {
			var selectedProfileIds = [],
				selectedProfileNames = [],
				form = this.$el.find( '#profile-select-ga-form' );
			Ss.info( 'profileSelectModalView::connectGoogleAnalyticsProfiles' );

			Ss.networkConnect.app.profileSelectCollection.each( function( profileModel ) {
				if ( profileModel.get( 'selected' ) ) {
					selectedProfileIds.push( profileModel.get( 'id' ) );
					selectedProfileNames.push( profileModel.get( 'name' ) );
				}
			} );

			form.children( '#ga-id-str' ).val( selectedProfileIds.join( ',' ) );
			form.children( '#ga-display-names' ).val( selectedProfileNames.join( '~~' ) );
			form.submit();
		},

		connectGooglePlusPages : function() {
			var selectedProfileIds = [],
			selectedProfileNames = [],
			form = this.$el.find( '#profile-select-gplus-form' );

			Ss.networkConnect.app.profileSelectCollection.each( function( profileModel ) {
				if ( profileModel.get( 'selected' ) ) {
					selectedProfileIds.push( profileModel.get( 'id' ) );
					selectedProfileNames.push( profileModel.get( 'name' ) );
				}
			} );

			form.children( '#gplus-id-str' ).val( selectedProfileIds.join( ',' ) );
			form.children( '#gplus-display-names' ).val( selectedProfileNames.join( '~~' ) );
			form.submit();
		},

		close : function( ev ) {
			Ss.info( 'profileSelectModalView::close' );
			if ( ev ) {
				ev.preventDefault();
			}
			this.$el.dialog( 'close' );
			this.redirect();
			return false;
		},

		back : function() {
			var self = this,
				selectedProfileType,
				selectedGroupId = Ss.networkConnect.app.groupProfilesCollection.where( { selected : true } )[ 0 ].get( 'id' );

			Ss.info( 'profileSelectModalView::back' );

			if ( Ss.networkConnect.app.selected.profileType === 'facebook' ) {
				selectedProfileType = ( Ss.networkConnect.app.selected.facebookType === 'profile' ) ? 'facebook_profile' : 'facebook_page';
			} else {
				selectedProfileType = Ss.networkConnect.app.selected.profileType;
			}

			if (Ss.networkConnect.app.profileSelectCollection.showProfileSelectModal === false) {
				self.redirect();
				return false;
			}

			$.post( '/settings/accounts/saveSelectedProfileType/'+ selectedProfileType +'/'+ selectedGroupId ).done( function() {
				self.redirect();
			} );

			return false;
		},

		redirect : function() {
			Ss.util.redirect( Ss.networkConnect.app.profileSelectCollection.closeUrl );
		},

		teardown : function() {
			Ss.info( 'profileSelectModalView::teardown' );

			this.$el.dialog( 'destroy' );
			this.remove();
			this.off();

			this.collection.teardown();
		}
	};

	t.groupProfileConnectModalViewCore = {
		className : 'proxima',

		pollinatorFeature : 'connect_a_profile',

		events : {
			'click .profile-connect-cancel' : 'close',
			'click .profile-connect-done' : 'close',
			'click .profile-connect-retry' : 'retryConnection',
			'click .profile-connect-profile' : 'evActivateProfile',
			'click .profile-connect-proceed' : 'proceed',
			'click .js-contact-plug' : 'showContactInfo',
			'click .js-contact-sub-modal' : 'closeSubModal',
			'click .js-start-livechat' : 'startLiveChat',
			'change .profile-connect-groupselect' : 'changeGroup'
		},

		initialize : function() {
			Ss.info( 'groupProfileConnectModalView::initialize' );
			_.bindAll( this );

			this.collection.on( 'change:selected', this.render );
			this.collection.on( 'change:data', this.render );
			this.collection.on( 'change:apiError', this.render );
		},

		generateCustomergroupsTemplateVar : function() {
			var rawGroupData = this.collection.toJSON(),
				customerGroupsData = _.groupBy( rawGroupData, function( group ) { return group.customer.name; } ),
				customerGroupsStache = [];
			Ss.info( 'groupProfileConnectModalView::generateCustomergroupsTemplateVar' );

			_.forEach( customerGroupsData, function( customerGroupsArr, customerName ) {
				customerGroupsStache.push( { customerName : customerName, groups : customerGroupsArr } );
			} );

			return ( customerGroupsStache.length !== 0 ) ? customerGroupsStache : false;
		},

		generateTemplateVarsFor : function( selectedGroup ) {
			var groupProfileData = selectedGroup.toJSON(),
				stache = {
					loading : !groupProfileData.data || selectedGroup.isRetrievingDataFromAPI,
					hasError : !!groupProfileData.apiError,
					customergroups : this.generateCustomergroupsTemplateVar(),
					showGroupSelector : Ss.networkConnect.app.groupProfilesCollection.length > 1,
					hasGoogleAnalytics : groupProfileData.data && groupProfileData.data.google_analytics && groupProfileData.data.google_analytics.is_available === 'YES',
					hasOnlyGoogleReader : selectedGroup.isReaderStillGoogle()
				};
			Ss.info( 'groupProfileConnectModalView::generateTemplateVarsFor', groupProfileData );

			stache[ Ss.networkConnect.app.selected.action ] = true;
			if ( groupProfileData.data ) {
				stache.numProfilesAvailable = groupProfileData.data.restricted.total_available; //total left
				stache.numProfilesUsed = (groupProfileData.data.plans.num_real_networks - groupProfileData.data.restricted.total_available); //total allowed - available
				stache.numProfilesAllowed = groupProfileData.data.plans.num_real_networks; //total allowed
				stache.upgradePlan = ( groupProfileData.data.restricted.total_available !== undefined && groupProfileData.data.restricted.total_available < 1 );
				stache.canUpgradePlan = (groupProfileData.data.plans.description !== undefined && groupProfileData.data.plans.description !== 'Premium Plan'  );
			}

			return stache;
		},

		render : function( selectedGroup ) {
			var $target;
			Ss.info( 'groupProfileConnectModalView::render' );

			if ( Ss.networkConnect.app.selected.action !== 'select' ) {
				this.$el.empty().append( Ss.template( 'components_network_connect' )( this.generateTemplateVarsFor( selectedGroup ) ) );

				if ( Ss.networkConnect.app.groupProfilesCollection.length > 1 ) {
					this.renderGroupSelector(); // don't show group selector if there's only one group.
				}

				this.trigger( 'render' );

				$target = this.$el.find( '.' + Ss.networkConnect.app.selected.profileType + '.profile-connect-profile' );

				if ( Ss.networkConnect.app.selected.action === 'add' && Ss.networkConnect.app.selected.profileType ) { // selectedGroup.get( 'data' ) <-- not sure why this was part of the conditional.
					this.activateProfile( $target, Ss.networkConnect.app.selected.profileType );
				} else if ( Ss.networkConnect.app.selected.action === 'success' && !selectedGroup.get( 'apiError' ) ) {
					this.updateViewElementsForProfile( $target, selectedGroup ); // highlights the buttons on success state rather than leaving them grayed out.
				}

				this.dialogWrap();
			}

			return this;
		},

		renderGroupSelector : function() {
			var sproutmenuOptions = {
					transferClasses : true,
					wrapperElement: '<div class="profile-connect-groupselect-ui" />',
					width: 200,
					showFilter : false
				};
			Ss.info( 'groupProfileConnectModalView::renderGroupSelector' );

			this.$el.find( '.profile-connect-groupselect' ).sproutmenu(
				( $( '.profile-connect-groupselect-ui' ).length > 0 ) ?
				'refresh' :
				sproutmenuOptions
			);

			return this;
		},

		dialogWrap : function() {
			var dialogOptions = { // jqueryUI dialog options
					width : 760,
					position : { my : 'center', at : 'center', of : window, collision : 'fit' },
					resizable : false,
					draggable : false,
					autoOpen : true,
					stack : true,
					modal : true,
					dialogClass : 'profile-connect-dialog puff'
				};
			Ss.info( 'groupProfileConnectModalView::dialogWrap' );

			if ( this.$el.parent().length === 0 ) {
				this.$el.dialog( dialogOptions );
				this.renderDialogOverlay();
			} else if ( !this.$el.dialog( 'isOpen' ) ) { // dialog already initiated
				this.$el.dialog( 'open' );
				this.renderDialogOverlay();
			}

			return this;
		},

		renderDialogOverlay : function() {
			var allOverlays = $.ui.dialog.overlay.instances,
				thisDialogOverlay = allOverlays[ allOverlays.length - 1 ],
				self = this;
			Ss.info( 'groupProfileConnectModalView::renderDialogOverlay' );

			thisDialogOverlay.
				addClass( 'dark_overlay' ).
				on( 'click.closeDialog', function() {
					thisDialogOverlay.off( 'click.closeDialog' );
					self.close();
				} );

			return this;
		},

		changeGroup : function( ev ) {
			var selectedGroupId = parseInt( $( ev.currentTarget ).val(), 10 );
			Ss.info( 'groupProfileConnectModalView::changeGroup' );

			this.collection.where( { id : selectedGroupId } )[ 0 ].
				set( 'selected', true ).
				getData();

			return true;
		},

		evActivateProfile : function( ev ) {
			var $target = $( ev.currentTarget ),
				profileType = $target.data( 'type' );
			Ss.info( 'groupProfileConnectModalView::evActivateProfile' );
			ev.preventDefault();

			Ss.networkConnect.app.selected.action = 'add';
			this.activateProfile( $target, profileType );

			return false;
		},

		activateProfile : function( $target, profileType ) {
			var selectedGroup = this.collection.where( { selected : true } )[ 0 ];
			Ss.info( 'groupProfileConnectModalView::activateProfile' );

			$target.addClass( 'active' ).
				siblings().removeClass( 'active' );

			Ss.networkConnect.app.selected.profileType = profileType;
			Ss.networkConnect.app.selected.profileData = undefined;

			this.updateViewElementsForProfile( selectedGroup ).
				trigger( 'activateProfile' );

			return false;
		},

		updateViewElementsForProfile : function( selectedGroup ) {
			Ss.info( 'groupProfileConnectModalView::updateViewElementsForProfile' );

			return this.
				determineShowFooterMessage().
				determineShowButtons( selectedGroup ).
				determineShowGroups();
		},

		determineShowFooterMessage : function() {
			var restrictedEl, unlimitedEl;
			Ss.info( 'groupProfileConnectModalView::determineShowFooterMessage' );

			if ( Ss.networkConnect.app.selected.action === 'add' ) {
				restrictedEl = this.$el.find( '.profile-connect-footer-msg.restricted' );
				unlimitedEl = this.$el.find( '.profile-connect-footer-msg.unlimited' );

				if ( $.inArray( Ss.networkConnect.app.selected.profileType, Ss.networkConnect.app.restrictedProfiles ) > -1 ) {
					unlimitedEl.hide();
					restrictedEl.show();
				} else {
					restrictedEl.hide();
					unlimitedEl.show();
				}
			}

			return this;
		},

		determineShowButtons : function( selectedGroup ) {
			var $doneButton = this.$el.find( '.profile-connect-done' ),
				$cancelButton = this.$el.find( '.profile-connect-cancel' ),
				$proceedContainer = this.$el.find( '.profile-connect-proceed-container' ),
				$proceedButton = this.$el.find( '.profile-connect-proceed' ),
				groupVars;
			Ss.info( 'groupProfileConnectModalView::determineShowButtons' );

			if ( // action = add, selected profile is not google reader or it is google reader but it's not connected
					Ss.networkConnect.app.selected.action === 'add' && !(
						Ss.networkConnect.app.selected.profileType === 'rssreader' &&
						( groupVars = selectedGroup.get( 'reader_data' ) ) && groupVars.email
					)
			) {
				$proceedButton[
					selectedGroup.isProfileAddableToGroup() ?
						'removeClass' : 'addClass'
				]( 'disabled' );
				$proceedContainer.css( 'display', 'inline-block' );
				$doneButton.hide();
				$cancelButton.css( 'display', 'inline' );
			} else {
				$proceedContainer.hide();
				$doneButton.css( 'display', 'inline-block' );
				$cancelButton.hide();
			}

			return this;
		},

		determineShowGroups : function() {
			Ss.info( 'groupProfileConnectModalView::determineShowGroups' );

			this.$el.find( '.profile-connect-groups' )[
				( Ss.networkConnect.app.selected.action === 'add' ) ? 'show' : 'hide'
			]();

			return this;
		},

		proceed : function( ev ) {
			var $button = $( ev.currentTarget );
			Ss.info( 'groupProfileConnectModalView::proceed' );
			ev.preventDefault();

			if ( Ss.networkConnect.app.selected.profileType ) {
				$button.addClass( 'no-action' );
				Ss.util.redirect( this.getRedirectUrl() );
			}

			return false;
		},
		showContactInfo : function () {
			var hasLiveChat = (Ss.user.entitlements.live_support ? true : false);
			this.$el.append( Ss.template( 'components_network_connect_contact' )({ livechat: hasLiveChat }) );
		},
		closeSubModal : function ( ev ) {
				$('.pc-connect-sub-modal').remove();
		},
		startLiveChat : function () {

			window.open('https://secure.livechatinc.com/licence/1060511/open_chat.cgi?groups=0','Chat_1060511','width=530,height=520,resizable=yes,scrollbars=no');
		},
		getRedirectUrl : function() {
			var groupProfileData = this.collection.where( { selected : true } )[ 0 ].toJSON(),
				selected = Ss.networkConnect.app.selected,
				url = false;
			Ss.info( 'groupProfileConnectModalView::getRedirectUrl' );

			if ( $.inArray( selected.profileType, Ss.networkConnect.app.restrictedProfiles ) > -1 ) {
				url = ( selected.profileType === 'facebook' ) ?
					groupProfileData.data.restricted[ selected.profileType ][ 'href_' + selected.facebookType ] :
					groupProfileData.data.restricted[ selected.profileType ].href;
			} else if ( selected.profileType === 'google_analytics_website' ) {
				url = groupProfileData.data.google_analytics.href;
			} else if ( selected.profileType === 'rssreader' ) {
				url = Ss.networkConnect.generateConnectUrl( groupProfileData.id, 'rssreader' );
			}

			if ( url && url.indexOf( '/' ) !== 0 ) {
				url = '/' + url;
			}

			return url;
		},

		retryConnection : function( ev ) {
			ev.preventDefault();

			this.collection.where( { selected : true } )[ 0 ].resetData( true );

			return false;
		},

		close : function( ev ) {
			var self = this,
				$dialogEl = this.$el.closest( '.ui-dialog' ),
				origMargin = $dialogEl.css( 'marginTop' );
			Ss.info( 'groupProfileConnectModalView::close' );
			if ( ev ) {
				ev.preventDefault();
			}

			// self.collection.where( { selected : true } )[ 0 ].resetData(); // there was a reason for this, but i can't remember what.
			this.$el.find( '.profile-connect-groupselect' ).sproutmenu( 'close' );

			$dialogEl.animate(
				{ opacity: 0, marginTop: -210 },
				400,
				'easeOutExpo',
				function() {
					self.$el.dialog( 'close' );
					$dialogEl.css( { opacity: 1, marginTop: origMargin } );
				}
			);

			return false;
		},

		teardown : function() {
			Ss.info( 'groupProfileConnectModalView::teardown' );

			this.$el.find( '.profile-connect-groupselect' ).sproutmenu( 'destroy' );

			this.$el.dialog( 'destroy' );
			this.remove();
			this.off();

			this.collection.teardown();
			this.collection = undefined;
		}
	};

	t.connectModalDescriptionBoxViewCore = {
		id : 'profile-connect-description',
		events : {
			'click .facebook .profile-connect-other' : 'switchFacebookDescription',
			'click .rssreader .profile-connect-link' : 'rssReaderAction'
		},

		initialize : function() {
			Ss.info( 'connectModalDescriptionBoxView::initialize' );
			_.bindAll( this );

			Ss.networkConnect.app.groupProfileConnectModalView.on( 'activateProfile', this.render );
			Ss.networkConnect.app.groupProfileConnectModalView.on( 'render', this.render );
		},

		render : function() {
			var stache = this.generateTemplateVars();
			Ss.info( 'connectModalDescriptionBoxView::render' );

			this.$el.
				empty().append( Ss.template( 'components_network_connect_description' )( stache ) )[
						stache.defaultMessage ? 'addClass' : 'removeClass'
					]( 'no-info' ).
				appendTo( Ss.networkConnect.app.groupProfileConnectModalView.$el.find( '#profile-connect-description-container' ) );

			this.delegateEvents();

			return this;
		},

		generateTemplateVars : function() {
			var profileDataForGroup = Ss.networkConnect.app.groupProfilesCollection.where( { selected : true } )[ 0 ].toJSON(),
				profileType = Ss.networkConnect.app.selected.profileType,
				stache = {
					adminOrOwner : ( profileDataForGroup.role === 'owner' || profileDataForGroup.role === 'admin' ),
					upgradePlan : ( profileDataForGroup.data && profileDataForGroup.data.restricted.total_available < 1 ),
					isOwner : ( profileDataForGroup.role === 'owner' ),
					hasMoreThanOneGroup : Ss.networkConnect.app.groupProfilesCollection.length > 1
				};
			Ss.info( 'connectModalDescriptionBoxView::generateTemplateVars' );

			if ( profileType ) {
				stache[ profileType ] = true;
			} else {
				stache.defaultMessage = true;
			}

			stache[ Ss.networkConnect.app.selected.action ] = true;
			stache[ Ss.networkConnect.app.selected.facebookType ] = true;
			stache.group = profileDataForGroup.name;

			if ( Ss.networkConnect.app.selected.profileData ) {
				if (
						( profileType === 'facebook' && Ss.networkConnect.app.selected.facebookType === 'page' ) ||
						profileType === 'gplus'
				) {
					$.extend( stache, Ss.networkConnect.app.selected.profileData );
					stache.hasMoreThanOnePageConnected = stache.numProfiles > 1;
				} else {
					$.extend( stache, Ss.networkConnect.app.selected.profileData.data[ 0 ] );
				}
			}

			this.fillGoogleReaderTemplateVars( stache, profileDataForGroup );

			return stache;
		},

		fillGoogleReaderTemplateVars : function( stache, profileDataForGroup ) {
			Ss.info( 'connectModalDescriptionBoxView::fillGoogleReaderTemplateVars' );
			if (
					Ss.networkConnect.app.selected.profileType === 'rssreader' &&
					( stache.alreadyConnected = !!( profileDataForGroup.reader_data && profileDataForGroup.reader_data.email ) )
			) {
				stache[ profileDataForGroup.reader_data.type ] = true; // google or feedly
				stache.group = profileDataForGroup.name;
				profileDataForGroup.reader_data.type === 'google' && ( stache.googleReaderDiscontinueDayCount = this.calculateGoogleReaderExpirationDays() );
			}

			return this;
		},

		calculateGoogleReaderExpirationDays : function() {
			var expireDate = new Date( '2013-07-01' ),
				today = new Date(),
				daysLeft = Math.floor( ( expireDate - today ) / ( 1000 * 60 * 60 * 24 ) );

			return ( daysLeft > 0 ) ? daysLeft : false;
		},

		switchFacebookDescription : function( ev ) {
			var facebookType = $( ev.currentTarget ).data( 'facebook-type' );
			ev.preventDefault();
			Ss.info( 'connectModalDescriptionBoxView::switchFacebookDescription' );

			Ss.networkConnect.app.selected.facebookType = facebookType;

			this.render();

			return false;
		},

		rssReaderAction : function( ev ) {
			var $target = $( ev.currentTarget ),
				readerAction = $target.data( 'action' ),
				selectedGroup = Ss.networkConnect.app.groupProfilesCollection.where( { selected : true } )[ 0 ],
				readerConnectUrl = Ss.networkConnect.generateConnectUrl( selectedGroup.get( 'id' ), 'rssreader' ),
				disconnectUrl = ( selectedGroup.isReaderStillGoogle() ) ? '/googlereader/disconnectReader/' : '/oauthhandler/disconnectFeedly/';

			Ss.info( 'connectModalDescriptionBoxView::rssReaderAction' );

			selectedGroup.resetData();

			if ( readerAction === 'switch' ) {
				Ss.util.redirect( readerConnectUrl );
			} else {
				$.ajax( {
					type : 'POST',
					url : disconnectUrl,
					cache : false
				} ).done( function() {
					if ( Ss.feeds.router ) { // we're currently in feeds.
						selectedGroup.resetData();
						window.location.reload( true );
					} else {
						selectedGroup.resetData( true );
					}
				} );
			}

			return false;
		},

		teardown : function() {
			Ss.info( 'connectModalDescriptionBoxView::teardown' );
			this.remove();
			this.off();
		}
	};

	t.groupProfilesCollectionCore = {
		initialize : function() {
			Ss.info( 'groupProfilesCollection::initialize' );
			this.model = Ss.networkConnect.models.groupProfile;

			this.on( 'change:selected', this.deselectAllExcept, this );
		},

		deselectAllExcept : function( selectedModel ) {
			var unselectedModels;
			Ss.info( 'groupProfilesCollection::deselectAllExcept', selectedModel );

			if ( selectedModel.get( 'selected' ) ) {
				unselectedModels = this.without( selectedModel );

				_.forEach( unselectedModels, function( model ) {
					model.set( 'selected', false, { silent : true } );
				} );
			}
		},

		comparator : function( m1, m2 ) {
			var c1 = m1.attributes.customer.name && m1.attributes.customer.name.toLowerCase,
				c2 = m2.attributes.customer.name && m2.attributes.customer.name.toLowerCase,
				n1 = m1.attributes.name && m1.attributes.name.toLowerCase,
				n2 = m2.attributes.name && m2.attributes.name.toLowerCase;

			if ( c1 !== c2 ) {
				if ( c1 < c2 ) {
					return c1;
				} else if ( c1 > c2 ) {
					return c2;
				}
			} else if ( n1 !== n2 ) {
				if ( n1 < n2 ) {
					return n1;
				} else if ( n1 > n2 ) {
					return n2;
				}
			}

			return 0;
		},

		teardown : function() {
			Ss.info( 'groupProfilesCollection::teardown' );
			this.off();

			this.each( function( model ) {
				model.teardown();
			} );

			this.model = undefined;
			this.reset();
		}
	};

	t.groupProfileModelCore = {
		isRetrievingDataFromAPI : false,
		isRetrievingReader : false,

		defaults : {
			selected : false,
			data : null,
			reader_data : null,
			apiError : null
		},

		initialize: function(){
			Ss.info( 'groupProfileModel::initialize' );
			_.bindAll( this );

			this.cacheKey = 'ntwk_connect_data_'+ this.get( 'customer' ).id +'_'+ this.get( 'id' );

			this.setUrl();
		},

		setUrl : function() {
			Ss.info( 'groupProfileModel::setUrl', this );

			this.url = '/settings/accounts/addNetworkDetails/'+ this.get( 'customer' ).id + '/'+ this.get( 'id' ) +'/';
			return this;
		},

		isProfileAddableToGroup : function() {
			var data = this.get( 'data' ),
				readerData = this.get( 'reader_data' );
			Ss.info( 'groupProfileModel::isProfileAddableToGroup' );

			if (
					Ss.networkConnect.app.selected.profileType === undefined ||
					$.inArray( Ss.networkConnect.app.selected.profileType, Ss.networkConnect.app.restrictedProfiles ) > -1
			) {
				return !!( data && data.restricted.total_available > 0 );
			} else if ( Ss.networkConnect.app.selected.profileType === 'rssreader' && !( readerData && readerData.email ) ) {
				return true;
			} else if ( Ss.networkConnect.app.selected.profileType === 'google_analytics_website' ) {
				return true;
			}

			return false;
		},

		isReaderStillGoogle : function() {
			var readerData = this.get( 'reader_data' );

			return !!( readerData && readerData.type === 'google' );
		},

		getData : function() {
			var self = this,
				networkData = Ss.cache.get( this.cacheKey );
			Ss.info( 'groupProfileModel::getData', this, arguments );

			if ( !networkData ) {
				if ( !this.isRetrievingDataFromAPI ) {
					this.isRetrievingDataFromAPI = true; // prevents from double ajax calls within a short period of time

					this.
						fetch().
						always( function() {
							self.isRetrievingDataFromAPI = false;
						} ).
						done( function( response ) {
							networkData = self.prepResponseData( response );
							Ss.cache.set( self.cacheKey, networkData, 300 );
							self.set( networkData, { silent : true } );
							self.trigger( 'change:data', self ); // ensure that we trigger render
						} ).
						fail( function( error ) {
							self.set( 'apiError', error, { silent : true } );
							self.trigger( 'change:apiError', self );
						} );
				}
			} else {
				this.set( networkData );
			}

			return this;
		},

		fetch : function() {
			var groupProfileApi = ( this.get( 'role' ) !== 'default' ) ?
					$.ajax( this.url, {
						type : 'GET',
						cache : false,
						timeout : 10000 // 10 seconds
					} ) :
					( $.Deferred() ).resolve( { // dummy API response for non-owners and non-admins
						data : {
							can_add_fb_fan_page : false,
							custom_network_count : 0,
							google_analytics : { has_connected : false, is_available : false, total_available : 0 },
							plans : { num_real_networks : 0, total_available : 0 },
							restricted : {
								total_available : 0,
								facebook : { has_connected : false, is_available : false, total_available : 0 },
								twitter : { has_connected : false, is_available : false, total_available : 0 },
								linkedin : { has_connected : false, is_available : false, total_available : 0 },
								gplus : { has_connected : false, is_available : false, total_available : 0 }
							}
						}
					} ),
				readerAccountApi = $.ajax( '/api/reader/', {
					type : 'GET',
					cache : false
				} );
			Ss.info( 'groupProfileModel::fetch' );

			return this.handleApiResponses( groupProfileApi, readerAccountApi );
		},

		handleApiResponses : function( groupProfileApi, readerAccountApi ) {
			var self = this,
				apiWrapper = $.Deferred(), // wrapper needed because the reader api only responds when a reader account is connected, otherwise it 404's, which would cause the normal solution of $.when to auto-fail even before getting the rest of our api data.
				combinedResponseData = {};

			groupProfileApi.done( function( response ) {
				$.extend( combinedResponseData, response );
			} ).fail( function( xhr, status, errorThrown ) {
				combinedResponseData.apiError = errorThrown;
			} ).always( function() {
				self.ensureApisRespond( apiWrapper, combinedResponseData );
			} );

			readerAccountApi.done( function( response ) {
				$.extend( combinedResponseData, { reader_data : response.data } );
			} ).fail( function( xhr, status, errorThrown ) { // it is assumed that when this call fails, it's because the user has not set up his google reader account.
				$.extend( combinedResponseData, { reader_data : { error : errorThrown } } );
			} ).always( function() {
				self.ensureApisRespond( apiWrapper, combinedResponseData );
			} );

			return apiWrapper.promise();
		},

		ensureApisRespond : function( apiWrapper, combinedResponseData ) {
			Ss.info( 'groupProfileModel::ensureApisRespond' );

			if ( combinedResponseData.data && combinedResponseData.reader_data ) {
				apiWrapper.resolve( combinedResponseData );
			} else if ( combinedResponseData.apiError ) {
				apiWrapper.reject( combinedResponseData.apiError );
			}
		},

		prepResponseData : function( response ) {
			var data = response.data,
				custom_network_per_group_count = data.custom_network_count;
			Ss.info( 'groupProfileModel::prepResponseData', this, data );

			data.group_id = this.get( 'id' );
			data.isPersonalGroup = false; // this.get( 'is_personal' )

			if ( custom_network_per_group_count === undefined ) { // will come back as undefined for personal groups
				custom_network_per_group_count = false;
			}

			if (
					data.google_analytics.is_available === 'YES' ||
					data.google_analytics.is_available === 'UPGRADE' ||
					( data.google_analytics.is_available === 'NO' && data.google_analytics.has_connected )
			) {
				data.google_analytics.href = Ss.networkConnect.generateConnectUrl( data.group_id, 'ganalytics' );
			}

			if (
					data.restricted.twitter.is_available === 'YES' ||
					data.restricted.twitter.is_available === 'UPGRADE' ||
					( data.restricted.twitter.is_available === 'NO' && data.restricted.twitter.has_connected )
			) {
				data.restricted.twitter.total_available = custom_network_per_group_count || data.restricted.twitter.total_available;
				data.restricted.twitter.href = Ss.networkConnect.generateConnectUrl( data.group_id, 'twitter' );
			}

			if (
					data.restricted.facebook.is_available === 'YES' ||
					data.restricted.facebook.is_available === 'UPGRADE' ||
					( data.restricted.facebook.is_available === 'NO' && data.restricted.facebook.has_connected )
			) {
				data.restricted.facebook.total_available = custom_network_per_group_count || data.restricted.facebook.total_available;
				data.restricted.facebook.href_profile = Ss.networkConnect.generateConnectUrl( data.group_id, 'facebookprofile' );
				data.restricted.facebook.href_page = Ss.networkConnect.generateConnectUrl( data.group_id, 'facebookfanpage' );
			}

			if (
					data.restricted.linkedin.is_available === 'YES' ||
					data.restricted.linkedin.is_available === 'UPGRADE' ||
					( data.restricted.linkedin.is_available === 'NO' && data.restricted.linkedin.has_connected )
			) {
				data.restricted.linkedin.total_available = custom_network_per_group_count || data.restricted.linkedin.total_available;
				data.restricted.linkedin.href = Ss.networkConnect.generateConnectUrl( data.group_id, 'linkedin' );
			}

			if (
					data.restricted.gplus.is_available === 'YES' ||
					data.restricted.gplus.is_available === 'UPGRADE' ||
					( data.restricted.gplus.is_available === 'NO' && data.restricted.gplus.has_connected )
			) {
				data.restricted.gplus.total_available = custom_network_per_group_count || data.restricted.gplus.total_available;
				data.restricted.gplus.href = Ss.networkConnect.generateConnectUrl( data.group_id, 'gplus' );
			}

// data.restricted.total_available = 0; // used for testing "upgrade your plan" state.
			return response;
		},

		resetData : function( fetch ) {
			Ss.cache.remove( this.cacheKey );
			this.set( { data : undefined, reader_data : undefined, apiError : undefined }, { silent : true } );

			if ( fetch ) {
				this.getData();
			}
			this.trigger( 'change:data', this );

			return this;
		},

		teardown : function() {
			Ss.info( 'groupProfileModel::teardown' );
			this.off();

			return this;
		}
	};

	t.oldNetworkConnect = { // copy and pasted from old code, mostly used for the "add a group" modal in settings
		facebookConnect : {
			/*
			 *Facebook choose page or personal modal
			 *
			 * group_id < 0 for new group connection
			 */
			askForConnectionType : function(group_id) {

				var dialog = {
					width : 550,
					title : 'Connect Facebook',
					resizable : false,
					height : 'auto',
					hide : 'fade',
					show : 'fade',
					autoOpen : true, // open when called
					modal : true,
					close : function() {
						$(this).remove();
					}
				};
				dialog = $(Ss.template('settings_networks_fb_connect_decide')({
					group_id : group_id
				}, true)).dialog(dialog);
				$('.ui-widget-overlay').addClass('black_dot_overlay').show();

				//register click listener for FB connect modal
				$('body').delegate('.ui-dialog #fb_connect_decide dl', 'click', function() {
					var isFanPage = true,
						groupId = $(this).data('group-id');

					if($(this).data('connection-type') === 'profile') isFanPage = false;

					Ss.network_connect.facebookConnect.handleSelection(groupId, isFanPage);
				});
			},

			/*
			 * Expects a blob of JSON data that represents Facebook fan pages that can be connected.
			 * Intended to be called from /settings/networkconnect/fb
			 *
			 * isNewGroup - true if a new group created when connecting this fan page. If true and no page is added, remove the group
			 */
			connectFanPages : function(jsonDataString, groupId, isNewGroup) {
				var dialog = {
					width : 550,
					title : 'Connect your Facebook Fan Pages',
					resizable : false,
					hide : 'fade',
					show : 'fade',
					wrapperElement: '<div class="connect_modal_wrap" />',
					height : 'auto',
					autoOpen : true, // open when called
					modal : false,
					close : function() {
						$(this).remove();
						Ss.loading.show();
						if (isNewGroup) {
							Ss.util.redirect( '/oauthhandler/handleFbNoConnect/' + groupId + '/' );
						} else {
							Ss.util.redirect( '/settings/accounts/group/' + groupId + '/' );
						}
					}
				},
				newJsonDataString,
				jsonData,
				obj;

				try {
					jsonData = JSON.parse(jsonDataString);
				} catch (err) {
					newJsonDataString = jsonDataString.replace("\\", "");	//remove any escaping slashes
					jsonData = JSON.parse(newJsonDataString);
				}
				obj = $.extend({},{CSRF_CODE:Ss.csrf},jsonData);
				$(Ss.template('settings_networks_fb_page_connect')(obj, true)).dialog(dialog);
			},
			/*
			 * Handle selection of FB connection type
			 */
			handleSelection : function(groupId, isFanPage) {
				var type = ( isFanPage ) ? 'facebookfanpage' : 'facebookprofile';

				if (groupId > 0) {	//existing group
					$('.ui-dialog').hide();	//hide all of the open dialogs
					Ss.loading.show();

					Ss.util.redirect( Ss.network_connect.generateConnectUrl(groupId, type) );
				} else {	//new group
					Ss.network_connect.groupCreate.setFacebookConnectionType( isFanPage );
				}
			},

			/*
			 * Validate FB fan page connection form
			 */
			validate: function() {

				var ids = '',
					num_pages = 0;
				$('#fb_pages_unconnected input').each(function() {	//fetch the selected pages and save as comma delimited string
					if ($(this).attr("checked")) {
						if (ids.length !== 0) {
							ids += ',';
						}
						ids += $(this).attr('fb_id');
						num_pages++;
					}
				});
				if (ids.length === 0) {
					Ss.shout('error', ['Please select at least one fan page', false]);
					return false;
				}
				var num_available = parseInt( $('#num_avail').html(), 10 ),
					unit = 'pages';
				if (num_available === 0) {unit = 'page';}
				if (num_pages > num_available) {
					Ss.shout('error', ['You can only add ' + num_available + unit, false]);
					return false;
				}
				$('#id_str').val(ids);
				$('#fb_connect_submit').val('Working...').attr('disabled', 'disabled').css('cursor','default');	//disable the send button
				return true;
			}
		},

		groupCreate : {
			fb_connect_btn_id: "new_group_facebook",
			form_id: "add_group_form",
			fb_connect_type_input_id: "connectionType",
			is_personal_group_id: "isPersonalGroup",
			/*
			 * Form validation
			 */
			validate : function() {
				var group_name = $.trim($('#add_group_name').val());
				if(group_name.length === 0) {
					Ss.shout('error', ['Please include a name for your new group', false]);
					return false;
				}
				return true;
			},
			/*
			 * Set necessary form values before submitting the form
			 */
			prepBeforeSubmit : function(clickEl) {
				if (!this.validate()) {return false;}

				var action = $(clickEl).attr('action');
				$('#action').val(action);

				if ($(clickEl).data('network') === 'facebook') {

					if ($('#'+this.is_personal_group_id).val() === 'true') {	//Personal groups can only have profile pages
						this.setFacebookConnectionType(false);
						this._submitForm();
					}
					else if ( !$('#'+this.fb_connect_type_input_id).val()) {Ss.network_connect.facebookConnect.askForConnectionType(-1);}	//no connection type has been selected, ask again
					else {this._submitForm();}	//we have everything we need - submit the form
				}
				else if ($(clickEl).data('network') === 'twitter') {
					this._submitForm();
				}
			},

			/*
			 * Called after the user selects what type of FB page to connect during group creation
			 */
			setFacebookConnectionType: function(isFanPage) {
				var connectionType = "profile";
				if (isFanPage) {connectionType = "fan";}

				$('#'+this.fb_connect_type_input_id).val(connectionType);
				this._submitForm();
			},

			_submitForm: function() {
				$('.ui-dialog').hide();	//hide all of the open dialogs
				Ss.loading.show();
				$('#'+this.form_id).submit();
			}
		}
	};

	Ss.init( function() {
		var connect;

		t.setup();
		connect = Ss.networkConnect;

		connect.generateConnectUrl = t.generateConnectUrl;

		t.init();
	} );
} )( jQuery, tester, undefined );

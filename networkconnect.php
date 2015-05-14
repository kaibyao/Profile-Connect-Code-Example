<?php

require_once APPPATH . 'controllers/settings/settingsrenderer.php';

/**
 * Controller used for any OAuth flow that connects multiple networks (e.g. Facebook, Google Analytics)
 */
class NetworkConnect extends SettingsRenderer {

	public function __construct() {
		parent::__construct();
		$this->beard->settingsView();
		$this->assets->loadJS('network_group_connect');
	}

	/*
	 * Handles Facebook fan page connections
	 *
	 * $isNewGroup - true if a new group created when connecting this fan page. False otherwise
	 */
	public function fb($groupId, $isNewGroup = false) {
		$this->beard->oversees('');	//no selected top nav option

		$this->load->model('group');
		$owner_customer_id = $this->group->getCustomerId($groupId);

		$this->load->library('FacebookManager', array('group_id'=>$groupId));
		$this->load->library('Tireswing/TireswingCustomers');

		//Handle personal group differently than regular - this is defensive since this page should never be reached for a personal group
		if ($this->group->isPersonalGroup($groupId)) {
			debug("personal group detected when fetching adding FB pages");
			$plan_resp = $this->tireswingcustomers->getPersonalPlan();
		}
		//check that FB is allowed and get the number of fan pages allowed
		else $plan_resp = $this->tireswingcustomers->getPlanStatus($owner_customer_id, $groupId);

		//get admin pages for the user that began the auth process
		$fan_page_array = $this->facebookmanager->fetchAdminPages();
		#debug(var_export($fan_page_array, true));

		$plan_details = $plan_resp->data;	//blocks until response
		#debug(var_export($plan_details, true));

		$fb_details = $plan_details['restricted']['facebook'];

//		$error = false;
//		if (!$plan_details['can_add_fb_fan_page'] || strcasecmp($fb_details['is_available'],'yes') !== 0) {
//			debug("Group ID [$groupId] can not add Facebook pages");
//			$error = 'You can not add Facebook pages with your plan';
//		}

		$pages_available = $fb_details['total_available'];
		/*
		 * The check for network availability in the plan occurs in the API during network creation
		 */

//		if ($pages_available <= 0) {
//			debug("Group ID [$groupId] can not add additional Facebook pages");
//			$error = 'You can not add any additional Facebook pages. Please remove some of your connected social profiles first.';
//		}

		$left_nav_data = array('name' => $this->accountlogin->getFirstName() .' '. $this->accountlogin->getLastName(), 'accounts_section' => 'y');
		$this->beard->with('settings/nav', $left_nav_data);

		$this->beard->needs('settings/content', null, array());	//generic blank template for all of settings
		$data = array('fb_pages'=>$fan_page_array, 'num_available'=>$pages_available, 'group_id'=>$groupId, 'error'=>$error);

		//stub
		#$stub_string = '{"fb_pages":[{"name":"Groupon Babies","id":"169389603094686","access_token":"AAAAATT1YoUABABh6ZC6IzxFTbZAPSCZCwO534SrMyqGZBIe62kGL4Dhz79abrWgcylCWUG8OWzjTTN2E9cVcVsdemUVk5NnfTfGZBShmOVwZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"Peter\'s Place","id":"136260306420370","access_token":"AAAAATT1YoUABAGFqHW2jRf4mDLLxlrxiA0oY0MgkTdq8ASFZBk3JJHZAv90pstptBZCAZARYNlGczMgYEKxpuP5o1b0VgDv8YGBs3xGeRQZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"Sprout Social","id":"138467959508514","access_token":"AAAAATT1YoUABAEZCVdpL8SWO0lrxCi4RoNiRFSFrE1u4zp850ipMd2y8ToBuTKGotofBhmLJ7R83c8dVKxkc7cw7xEdhLhENywSgV1QZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"600 W","id":"125461594145009","access_token":"AAAAATT1YoUABACASO1Ur4AtQh0cwqGZBcTHNun4vT6K9YxDZC9fgYKQlP9FITnf59i878nLWlLrZBRhJXuZAaZC642UvK2wfKLyIlLqHBkwZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"ss1","id":"302007967702","access_token":"AAAAATT1YoUABANZBtCMjqZCBB1v6egUJzxi68Tz29yQVghdehLeZCrAV0Hgyy2GDR25WJKPC5dQZAo5zi6xuqkxAjXcxwsu1qeAGqp0YWAZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"Sprout Social Testimonials","id":"112710138827883","access_token":"AAAAATT1YoUABAELZAowbOZAXnguTJK9AR3bF8HZB3GHn4CDgVt4D4bJ6xeDoMCBZCEjmocK2qNPDnwHiVUTTKQZBihZBiKRdCKtz8bIZC1DNwZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"},{"name":"Sprout Social","id":"331741700416","access_token":"AAAAATT1YoUABAEBujYR72msZBngtUJ7pBiPNDT9fW1xcr81Gn7pSKZBZA9uy8yL72DWxF58F3BuSbt0c435xcSEDEvjVf0KBbXpmxtZC8gZDZD","is_already_connected":false,"profile_user_id":"9339792","profile_user_token":"AAAAATT1YoUABALBI6Hsft0OtHY8ZBigeYfRhP5DEwLBjthhyF1ZCB5F0u5SuAZC2mlJmQHnw1HZCL7xXAG9xU0mG2dVVkosZD"}],"num_available":8,"group_id":"200120","error":false}';
		#$data = json_decode($stub_string);

		#debug(var_export($data, true));
		$this->beard->template(array('settings/nav'));
		$isNewGroupString = $isNewGroup ? 'true' : 'false';	//passed into JS call
		$createNewGroupString = ($this->session->flashdata('FB_NEW_GROUP')) ? 'true' : 'false';
		$grantedPermissionsString = ($this->session->flashdata('FB_PERMISSIONS') === 'granted') ? 'true' : 'false';


		$this->assets->script( "Ss.init( function() { Ss.networkConnect.init( $groupId, 'facebook_page', 'select', { data : ".json_encode($data, JSON_HEX_APOS | JSON_HEX_QUOT).", isNewGroup : $isNewGroupString, createNewGroup : $createNewGroupString,  granted_permissions : $grantedPermissionsString } ); } );" );

		$this->beard->looksgood();
	}

	/*
	 * Save FB pages. Expects a comma delimited string of IDs
	 */
	public function saveFb() {
		$this->load->library('form_validation');
		$this->form_validation->set_rules('id_str', '', 'trim|required');

		if ($this->form_validation->run() === false) {
			debug('Form validation error in networkconnect->saveFb()');
			return $this->_sendError();
		}

		$group_id = $this->input->post('g_id');

		//page IDs the user selected
		$ids_string = trim($this->input->post('id_str'), ',');	//trim any extra commas

		$this->load->library('FacebookManager', array('group_id'=>$group_id));

		try {
			$this->facebookmanager->updatePagesGrantedAccess($ids_string);

			$default_redirect = "/oauthhandler/redirectAfterFbConnection/".$group_id."/";
			header('Location: ' . $default_redirect);
		}
		catch (SproutException $e) {	//error occured during network creation - user should try again
			$errorCode = $e->getCode();
			if ($errorCode == 402) {	//user needs to pay for this profile (connected to too many trial accounts)
				redirect("/oauthhandler/handleProfileOverLimit/facebook/");
			}
			error_log("Exception with code [".$e->getCode()."] during FB page connection for group id [$group_id]");
			header('Location: /settings/networkconnect/fb/'.$group_id.'/');
		}
	}

	/*
	 * Handles Google Analytics website connections
	 */
	public function ga($groupId) {
		$this->beard->oversees('');	//no selected top nav option

		$this->load->model('group');
		$owner_customer_id = $this->group->getCustomerId($groupId);

		$this->load->library('GoogleManager', array('group_id'=>$groupId, 'login_id'=>$this->loginId));
		$this->load->library('Tireswing/TireswingCustomers');

		//Handle personal group differently than regular - this is defensive since this page should never be reached for a personal group
		if ($this->group->isPersonalGroup($groupId)) {
			debug("personal group detected when fetching adding GA websites");
			$plan_resp = $this->tireswingcustomers->getPersonalPlan();
		}
		//check that GA is allowed and get the number of websites allowed
		else $plan_resp = $this->tireswingcustomers->getPlanStatus($owner_customer_id, $groupId);

		$website_array = $this->googlemanager->getAnalyticsAccounts();
		#debug('website array: ' . var_export($website_array, true));

		$plan_details = $plan_resp->data;	//blocks until response
		#debug(var_export($plan_details, true));
		$goog_details = $plan_details['google_analytics'];

		$error = false;
		if (strcasecmp($goog_details['is_available'],'yes') !== 0) {
			debug("Group ID [$groupId] does not have access to Google Analytics");
			$error = 'You do not have access to Google Analytics with your plan';
		}

		$websites_available = $goog_details['total_available'];
		if ($websites_available <= 0) {
			debug("Group ID [$groupId] can not add additional GA Websites");
			$error = 'You can not add any additional Google Websites. Please remove some of your connected social profiles first.';
		}

		$left_nav_data = array('name' => $this->accountlogin->getFirstName() .' '. $this->accountlogin->getLastName(), 'accounts_section' => 'y');
		$this->beard->with('settings/nav', $left_nav_data);

		$this->beard->needs('settings/content', null, array());	//generic blank template for all of settings
		$data = array('ga_websites'=>$website_array, 'num_available'=>$websites_available, 'show_num_available'=>$websites_available < 10, 'group_id'=>$groupId, 'error'=>$error);

		$this->beard->template(array(
			'settings/nav'
		));
		$this->assets->script( "Ss.init( function() { Ss.networkConnect.init( $groupId, 'google_analytics_website', 'select', ".json_encode( $data, JSON_HEX_APOS | JSON_HEX_QUOT )." ); } );" );

		$this->beard->looksgood();
	}

	/*
	 * Save GA websites.
	 *
	 * Expects a comma delimited string of IDs and a corresponding string of page names delimited by ~~
	 */
	public function saveGA() {

		$this->load->library('form_validation');
		$this->form_validation->set_rules('id_str', '', 'trim|required');

		if ($this->form_validation->run() === false) {
			debug('Form validation error in networkconnect->saveGA()');
			return $this->_sendError();
		}

		$group_id = $this->input->post('g_id');

		//website IDs the user selected
		$ids_string = trim($this->input->post('id_str'), ',');	//trim any extra commas
		debug("saving these GA websites: " . $ids_string);

		$this->load->library('GoogleManager', array('group_id'=>$group_id, 'login_id'=>$this->loginId));

		try {
			$this->googlemanager->storeWebsitesConnected($group_id, $ids_string);

			$default_redirect = "/oauthhandler/redirectAfterConnection/".$group_id."/";
			header('Location: ' . $default_redirect);
		}
		catch (SproutException $e) {	//error occured during network creation - user should try again
			debug("Exception with code [".$e->getCode()."] during GA website connection");
			header('Location: /settings/networkconnect/ga/'.$group_id.'/');
		}
	}

	public function gplus($groupId) {
		$this->beard->oversees('');	//no selected top nav option

		$this->load->model('group');
		$owner_customer_id = $this->group->getCustomerId($groupId);

		$this->load->library('GooglePlusManager');
		$this->load->library('Tireswing/TireswingCustomers');

		//Handle personal group differently than regular - this is defensive since this page should never be reached for a personal group
		if ($this->group->isPersonalGroup($groupId)) {
			debug("personal group detected when fetching adding Gplus pages");
			$plan_resp = $this->tireswingcustomers->getPersonalPlan();
		}
		//check that Gplus is allowed and get the number of websites allowed
		else $plan_resp = $this->tireswingcustomers->getPlanStatus($owner_customer_id, $groupId);

		$pages_array = $this->googleplusmanager->getPagesUserManages($groupId);
//		debug('gplus pages array: ' . var_export($pages_array, true));

		$plan_details = $plan_resp->data;	//blocks until response
//		debug(var_export($plan_details, true));
		$goog_details = $plan_details['restricted']['gplus'];

		$error = false;
		if (strcasecmp($goog_details['is_available'],'yes') !== 0) {
			debug("Group ID [$groupId] does not have access to Google Plus");
			$error = 'You do not have access to Google Plus with your plan';
		}

		$pages_available = $goog_details['total_available'];
		if ($pages_available <= 0) {
			debug("Group ID [$groupId] can not add additional gplus pages");
			$error = 'You can not add any additional Google+ Pages. Please remove some of your connected social profiles first.';
		}

//		$pages_available = 100;
//		$error = null;

		$left_nav_data = array('name' => $this->accountlogin->getFirstName() .' '. $this->accountlogin->getLastName(), 'accounts_section' => 'y');
		$this->beard->with('settings/nav', $left_nav_data);

		$this->beard->needs('settings/content', null, array());	//generic blank template for all of settings
		$data = array('gplus_pages'=>$pages_array, 'num_available'=>$pages_available, 'group_id'=>$groupId, 'error'=>$error);

		$this->beard->template(array('settings/nav'));

		$this->assets->script( "Ss.init( function() { Ss.networkConnect.init( $groupId, 'gplus', 'select', { data : ".json_encode($data, JSON_HEX_APOS | JSON_HEX_QUOT)." } ); } );" );

		$this->beard->looksgood();
	}

	public function saveGplus() {
		$this->load->library('form_validation');
		$this->form_validation->set_rules('id_str', '', 'trim|required');

		if ($this->form_validation->run() === false) {
			debug('Form validation error in networkconnect->saveGA()');
			return $this->_sendError();
		}

		$group_id = $this->input->post('g_id');

		//gplus page IDs the user selected
		$ids_string = trim($this->input->post('id_str'), ',');	//trim any extra commas

		$this->load->library('GooglePlusManager');

		try {
			debug("saving these GPlus pages: " . var_export($ids_string, true));
			$this->googleplusmanager->storePagesConnected($group_id, $ids_string);

			$default_redirect = "/oauthhandler/redirectAfterConnection/".$group_id."/";
			header('Location: ' . $default_redirect);
		}
		catch (SproutException $e) {	//error occured during network creation - user should try again
			debug("Exception with code [".$e->getCode()."] during gplus page connection");
			header('Location: /settings/networkconnect/gplus/'.$group_id.'/');
		}
	}

	private function notifyApiOfChange($groupId) {
		$this->load->library('Tireswing/TireswingGroups');
		$this->tireswinggroups->pingGroupChanged($groupId);
		debug('API notified of group change');
	}
}

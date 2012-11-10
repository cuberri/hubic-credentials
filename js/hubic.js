/*!
 * hubic-credentials r3 1.0.0
 *
 * @author cuberri
 */
var my_sessionId
var my_accountName
var my_username
var my_secret
var my_privateurl

/**
 * Init stuff called when dom ready.
 */
function init(){
	console.debug("init()")

	$("#alerts").empty()

	// init stuff
	$("#imgAjaxLoaderLogin").hide()
	resetGetNasFieldSet()
	resetGetCredentialsFieldSet()

	// events bindings
	$("#btnNasLogin").click(myNasLogin)
	$("#btnGetNas").click(myGetNas)
	$("#btnGetCredentials").click(myGetCredentials)
}

/**
 * Reset the 'GetNas' par of the form
 */
function resetGetNasFieldSet() {
	$("#imgAjaxLoaderGetNas").hide()
	$("#btnGetNas").addClass("disabled").attr("disabled", "disabled")
	$("#sessionId").val("")
}

/**
 * Reset the 'GetCredentials' par of the form
 */
function resetGetCredentialsFieldSet() {
	$("#imgAjaxLoaderGetCredentials").hide()
	$("#btnGetCredentials").addClass("disabled").attr("disabled", "disabled")
	$("#accountName").val("")
}

/**
 * Get a session id : call the hubic's ws with the data colleced from the
 * 'Login' part of the form.
 * Update the 'GetNas' form with the session id
 */
function myNasLogin() {
	console.debug("myNasLogin()")
	resetGetNasFieldSet()
	$("#imgAjaxLoaderLogin").show()
	Ows.cloudnas.nasLogin.call({
	    email : $("#email").val(),
		password : $("#password").val()
	},function(success, reponse){
	    console.debug("reponse : " + JSON.stringify(reponse))
	    var node
	    if(success) {
	    	console.debug("myNasLogin() success")
	    	my_sessionId = reponse.answer.id
	    	node = $("<div>").addClass("alert alert-success").html("<strong>login :</strong>&nbsp;" + reponse.answer.login + "<br />" + "<strong>id :</strong>&nbsp;" + my_sessionId)
	    	$("#sessionId").val(my_sessionId)
	    	$("#btnGetNas").removeClass("disabled").removeAttr("disabled")
	    } else {
	    	console.debug("myNasLogin() error")
	    	node = $("<div>").addClass("alert alert-error")
	    		.text(reponse.error.exceptionType + " - " + reponse.error.message)
	    }
	    $("#alerts").empty().append(node)
	    $("#imgAjaxLoaderLogin").hide()
	})
}

/**
 * Get the private URL from hubic given a session id.
 * Update the 'GetCredentials' part of the form
 */
function myGetNas() {
	console.debug("myGetNas()")
	$("#imgAjaxLoaderGetNas").show()
	Ows.cloudnas.getNas.call({
		sessionId : $("#sessionId").val()
	},function(success, reponse){
		console.debug("reponse : " + JSON.stringify(reponse))
		var node
		if(success) {
			console.debug("myGetNas() success")
			my_accountName = reponse.answer[0].accountName
			my_privateurl = reponse.answer[0].url
			node = $("<div>")
				.addClass("alert alert-success")
				.html("<strong>private url :&nbsp;</strong>&nbsp;" + my_privateurl + "<br />" + "<strong>account name :</strong>&nbsp;" + my_accountName + "<br />" + "<strong>quota :</strong>&nbsp;" + reponse.answer[0].quota + "<br />" + "<strong>used :</strong>&nbsp;" + reponse.answer[0].used)
			$("#getPrivateUrlRes").empty()
				.append("<strong>Private URL :&nbsp;</strong><a href=\""+my_privateurl+"\">"+my_privateurl+"</a>")
			$("#accountName").val(my_accountName)
			$("#btnGetCredentials").removeClass("disabled").removeAttr("disabled")
		} else {
			console.debug("myGetNas() error")
			node = $("<div>").addClass("alert alert-error")
	    		.text(reponse.error.exceptionType + " - " + reponse.error.message)
		}
		$("#alerts").empty().append(node)
		$("#imgAjaxLoaderGetNas").hide()
	})
}

/**
 * Get the effective credentials associated with a hubic account name
 */
function myGetCredentials() {
	console.debug("myGetCredentials()")
	$("#imgAjaxLoaderGetCredentials").show()
	Ows.cloudnas.getCredentials.call({
		sessionId : $("#sessionId").val(),
		accountName : $("#accountName").val()
	},function(success, reponse){
		console.debug("reponse : " + JSON.stringify(reponse))
		var node
		if(success) {
			console.debug("myGetCredentials() success")
			my_username = reponse.answer.username
			my_secret = reponse.answer.secret
			node = $("<div>").addClass("alert alert-success").html("<strong>user name :</strong>&nbsp;" + my_username + "<br />" + "<strong>secret :</strong>&nbsp;" + my_secret)
			$("#getCredentialsRes").empty().append("<strong>User name :&nbsp;</strong>"+my_username+"<br /><strong>Secret :&nbsp;</strong>"+my_secret)
		} else {
			console.debug("myGetCredentials() error")
			node = $("<div>").addClass("alert alert-error")
	    		.text(reponse.error.exceptionType + " - " + reponse.error.message)
		}
		$("#alerts").empty().append(node)
		$("#imgAjaxLoaderGetCredentials").hide()
	})
}

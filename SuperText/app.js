$(function() {
	var toggleState;
	if (localStorage.getItem('toggle')=='off'){
		toggleState = false;
	}
	else{
		toggleState = true;
	}
	
	var USER_ID = "123456789";
	Parse.initialize("vGoyexsmOZWiBc75B1J7QWiQloHuQ0VlaXjl88b2", "IyL0wnodV3e41IytbRhqxBt2JSFekFHKAds7u0Kt");

	SavedDictionary = Parse.Object.extend("SavedDictionary");
	savedDict = new SavedDictionary();
	var query = new Parse.Query(SavedDictionary);

	query.equalTo("USER_ID", USER_ID);
	query.find({
		success: function(data) {
			savedDict = data[0];
		},
		error: function(error) {
		}
	});
	
	function toggle(){
		if (toggleState) {
			localStorage.setItem('toggle', 'off');
			$("#togglecover").animate({"left": "0px", "top": "0px"});
		} else {
			localStorage.setItem('toggle', 'on');
			$("#togglecover").animate({"left": "45px", "top": "0px"});
		}
		toggleState = !toggleState;
		savedDict.set("state", toggleState)
		savedDict.save();
	}
	
	function addMenuItem(string, index, func){
		var item = document.createElement('div');
		var text = document.createElement('div');
		var pointer = document.createElement('div');
		var height;
		
		$(item).addClass("textContainer").click(func);
		$(text).addClass("menuText");
		$(pointer).addClass("pointer");
		
		$(text).html(string);
		
		height = 22*index+5;
		$(item).css({"top": height, "left": "5px"});
		
		item.appendChild(text);
		item.appendChild(pointer);
		document.body.appendChild(item);
	}

	function startWordSearch(){
		var word = prompt("Search word: ");
		savedDict.set("request", word);
		savedDict.save();
	}

	$(document).ready(function(){
		var container = document.createElement('div');
		var toggleCover = document.createElement('div');
		var toggleOn = document.createElement('div');
		var toggleOff = document.createElement('div');		
		var background = document.createElement('div');
		var siding = document.createElement('div');
		
		$(container).addClass("toggleContainer").click(toggle);

		$(toggleOn).addClass("toggleButton").css({"left": "0px", "top": "0px", "background-image": "none"});
		$(toggleOn).html("<center>ON</center>");
		$(toggleOn).attr("id", "toggleon");
		
		$(toggleOff).addClass("toggleButton").css({"left": "45px", "top": "0px", "background-image": "none"});
		$(toggleOff).html("<center>OFF</center>");
		$(toggleOff).attr("id", "toggleoff");
		
		if (toggleState){
			$(toggleCover).addClass("toggleButton").css({"left": "45px", "top": "0px", "background-color": "LightGrey", "box-shadow": "none"});
		} 
		else {
			$(toggleCover).addClass("toggleButton").css({"left": "0px", "top": "0px", "background-color": "LightGrey", "box-shadow": "none"});
		}
		$(toggleCover).attr("id", "togglecover");
		
		$(background).addClass("gradient").css({"left": "0px", "top": "0px"});
		$(siding).addClass("sidePanel").css({"left": "5px", "top": "5px"});
		
		container.appendChild(toggleOn);
		container.appendChild(toggleOff);
		container.appendChild(toggleCover);
		document.body.appendChild(background);
		document.body.appendChild(siding);
		document.body.appendChild(container);
	
		addMenuItem("Clear Dictionary", 0, function(){
			savedDict.set("dict", []);
			savedDict.save();
			alert("Dictionary Cleared.");
		});
		addMenuItem("Help", 1, function(){alert("Shortcuts:\n Ctrl+Shift+F - similar search\n Ctrl+Shift+C - create/set category\n Ctrl+Space - select autocomplete\n Ctrl+< - move up auto selection\n Ctrl+> - move down auto selection")});
		addMenuItem("About", 2, function(){alert("This is SuperText.  Meet the future in interacting textually with your favourite browser, Chrome.\n\nWritten in 24 hours at Y-Hack 2013 by:\n Benjamin, Eric, David and Avery.")});
	});
});
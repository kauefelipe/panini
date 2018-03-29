$(document).ready(function main() {

	buildCromosHtml();

	loadData().then(function success() { /*dois thens encadeados funciona como always*/
		plotUserData();
		exibirTooltipContagem();
	}).then(function always() {
		$('#loading').hide();
	});

	$('#copyRepetidasBtn, #copyFaltantesBtn').tooltip({title: 'C o p i a d o !', trigger:'manual', placement: 'bottom'});
	$('#importCromosBtnGrp').tooltip({title: 'I m p o r t o u !', trigger:'manual', placement: 'left'});

	$('#cromos .btn-cromo').click(function cromoClick() {
		var value;

		if ($(this).hasClass('btn-repetida')){
			$(this).removeClass('btn-repetida');
			value = 0;
		}
		else if ($(this).hasClass('btn-success')) {
			$(this).removeClass('btn-success').addClass('btn-repetida');
			value = 2;
		}
		else {
			$(this).addClass('btn-success');
			value = 1;
		}

		saveData(parseInt($(this).text()), value);
	});


	$('#copyRepetidasBtn').click(function copyRepetidasClick() {
		var repetidas = getRepetidas().join(', ');
		console.log('Repetidas:', repetidas);
		copyText(`Tenho os seguintes cromos para trocar: ${repetidas}`);
		$(this).tooltip('show');
		setTimeout(()=> $(this).tooltip('hide'), 3000);
	});


	$('#copyFaltantesBtn').click(function copyFaltantesClick() {
		var faltantes = getFaltantes().join(', ');
		console.log('Faltantes:', faltantes);
		copyText(`Preciso dos seguintes cromos: ${faltantes}`);
		$(this).tooltip('show');
		setTimeout(()=> $(this).tooltip('hide'), 3000);
	});


	$('#newAlbumBtn').click(function newAlbumClick() {
		$(this).attr('disabled', true);
		$('#loading').show();

		$.ajax({
		    url:"https://api.myjson.com/bins",
		    type:"POST",
		    data:'[]',
		    contentType:"application/json; charset=utf-8",
		    dataType:"json",
		    success: function(data, textStatus, jqXHR){
		    	console.log(data);
				var albumId = data.uri.split('bins/')[1];
				window.location.hash = `#${albumId}`;
				alert(`A URL atualizou com o id do seu novo álbum, favorite esta página para voltar a sua coleção no futuro. ID do Álbum: ${albumId}`);

				/*recarrega para usar o novo id*/
				loadData().then(function success() { 
					plotUserData();
				});
		    },
		    complete: function () {
		    	$('#newAlbumBtn').attr('disabled', false);
		    	$('#loading').hide();
		    }
		}); 
	});


	$('#importCromosBtn').click(function importCromosClick() {
		var textToImport = $('#textToImport').val();
		var numbersToImport = textToImport
								.split(/\s+/)
								.join(',')
								.replace(/,,/g,',')
								.split(',')
								.map(s=>parseInt(s))
								.filter(n=>n>=0&&n<=681);

		if (numbersToImport.length == 0) {
			numbersToImport = [parseInt(textToImport.trim())] //caso de uso: importar um único número
		}
		console.log('cromos que serão importados:', numbersToImport);

		numbersToImport.forEach(function (n) {
			saveData(n, 1);
		});

		plotUserData();
		$('#importCromosBtnGrp').tooltip('show');
		setTimeout(()=> $('#importCromosBtnGrp').tooltip('hide'), 3000);
	});


	$('.navbar-brand').click(function contagemClick() {
		exibirTooltipContagem();
	});


	// document.body.addEventListener("online", function () {
	// 	console.log('Entrei online');
	// 	var failedToSave = JSON.parse(localStorage.getItem(albumId+'failedToSave'));
	// 	if (failedToSave) {
	// 		persistData();
	// 	}
	// }, false);

});

/*O estado a app é definido por essas variáveis globais*/
var userData;
var testAlbumId = 'w204n';
var albumId = testAlbumId;
var persistTimer;


function loadData() {

	var executor = function (resolve, reject) {
		var hash = window.location.hash;
		if (hash.length > 1) {
			albumId = hash.split('#')[1];
			$('.navbar-brand').attr('href', window.location.hash);
		}

		resetHtmlCromoStates();

		if (navigator.onLine) {
			loadDataOnline(resolve, reject);
		}
		else {
			loadDataOffline();
			resolve();
		}
	}

	return new Promise(executor);

}

function loadDataOffline() {
	var storedItem = localStorage.getItem(albumId);
	if (storedItem) {
		userData = JSON.parse(storedItem);
	}
	else {
		userData = [];
	}
}

function loadDataOnline(resolve, reject) {
	$.get("https://api.myjson.com/bins/"+albumId, function(data, textStatus, jqXHR) {
		console.log(data);
		userData = data;
		resolve();
	}).fail(function () {
		console.log('Erro ao carregar álbum.');
		alert('Erro ao carregar o álbum selecionado. Você pode ter digitado o ID errado ou algum problema com a conexão com a internet.');
		reject();
	});
}

function plotUserData() {
	var valueClasses = [ '', 'btn-success', 'btn-repetida' ];

	if (userData) {
		userData.forEach(function plotaCromo(cromo) {
			var cromoElem = $('#cromos .btn-cromo')[cromo.id];
			$(cromoElem).removeClass(valueClasses.join(' ')).addClass(valueClasses[cromo.value]);
		});
	}
}

function saveData(id, value) {
	var cromoToUpdate = userData.filter( d => d.id == id )[0]
	if (cromoToUpdate) {
		cromoToUpdate.value = value;
	}
	else
	{
		userData.push({"id": id, "value": value})
	}

	if (persistTimer) { /*só vai persistir após 3seg*/
		clearTimeout(persistTimer);
	}

	persistTimer = setTimeout(function () {
		persistData();
		persistTimer = null;
	}, 2000);
}

function persistData() {
	localStorage.setItem(albumId, JSON.stringify(userData));

	if (navigator.onLine) {
		$.ajax({
		    url:"https://api.myjson.com/bins/"+albumId,
		    type:"PUT",
		    data: JSON.stringify(userData),
		    contentType:"application/json; charset=utf-8",
		    dataType:"json",
		    success: function(data, textStatus, jqXHR){
		    	console.log(textStatus);
		    	localStorage.setItem(albumId+'failedToSave', "false")
		    }
		});
	}
	else {
		// localStorage.setItem(albumId+'failedToSave', "true")
		var failedSaveTimer = setInterval(function () {
			console.log('Entrei online');
			// var failedToSave = JSON.parse(localStorage.getItem(albumId+'failedToSave'));
			// if (failedToSave) {
				if (!persistTimer) { 
					persistData();
					clearInterval(failedSaveTimer);
				}
			// }
		}, 2000);
	}

}

function getRepetidas() {
	return userData.filter(cromo => cromo.value > 1 ).map(cromo => cromo.id).sort((a,b)=>a-b);
}

function getPossuidas() {
	return userData.filter(cromo => cromo.value > 0 ).map(cromo => cromo.id).sort((a,b)=>a-b);
}

function getFaltantes() {
	var todas = [];
	for (var i = 0; i < 682; i++) 
		todas.push(i);

	return todas.diff(getPossuidas());
}

function resetHtmlCromoStates() {
	$('#cromos .btn-success').removeClass('btn-success');
	$('#cromos .btn-repetida').removeClass('btn-repetida');
}

function buildCromosHtml() {
	var fragment = new DocumentFragment();

	for (let i=0; i<682; i++) {
		$(`<button type="button" class="btn btn-default btn-cromo">${i}</button>`).appendTo(fragment);
	}

	$(fragment).appendTo('#cromos');
}


var showTimer = null;
var showTime = 2500;
function exibirTooltipContagem() {

	if (showTimer) {
		clearTimeout(showTimer);
		showTimer = null;
		$('.navbar-brand').tooltip('hide');
		showTime = 5000; //aumenta o tempo de exibição depois da primeira exibição
	}
	else {
		var falta = getFaltantes().length;
		var total = $('#cromos .btn-cromo').length;
		var possui = total - falta;
		var repetidas = getRepetidas().length;

		var texto = `Você possui <b>${possui}</b> cromos.<br>Faltam <b>${falta}</b> de <b>${total}</b> para completar.<br>Repetidas: <b>${repetidas}</b>`;
		$('.navbar-brand').tooltip({html: true, title: 'calculando...', trigger:'manual', placement: 'bottom'}).tooltip('show');
		var tooltipElem = document.getElementById($('.navbar-brand').attr('aria-describedby'));
		$('.tooltip-inner', tooltipElem).html(texto);
		showTimer = setTimeout(()=>{$('.navbar-brand').tooltip('hide'); showTimer=null}, showTime);
	}
}

function copyText(text){
	function selectElementText(element) {
		if (document.selection) {
			var range = document.body.createTextRange();
			range.moveToElementText(element);
			range.select();
		} else if (window.getSelection) {
			var range = document.createRange();
			range.selectNode(element);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(range);
		}
	}
	var element = document.createElement('DIV');
	element.textContent = text;
	document.body.appendChild(element);
	selectElementText(element);
	document.execCommand('copy');
	element.remove();
}

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

if (typeof(console) == undefined) console = {log: s=>{} };
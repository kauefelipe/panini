$(document).ready(function main() {

	buildCromosHtml();

	loadData().then(function success() { /*dois thens encadeados funciona como always*/
		plotUserData();
		exibirTooltipContagem();
	}).then(function always() {
		$('#loading').hide();
	});

	$('#copyRepetidasBtn, #copyFaltantesBtn, #compareCromosBtnGrp, #compareMinhasRepetidasBtnGrp').tooltip({title: 'Copiado!', trigger:'manual', placement: 'bottom'});
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
		updateCounters();
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

	$('#resultCompareMinhasRepetidas, #resultCompare').click(function copyCompareMinhasRepetidasClick() {
		copyText($(this).text());
		var $btn = $(this).parents('.btn-group').find('.dropdown-toggle');
		$btn.tooltip('show');
		setTimeout(()=> $btn.tooltip('hide'), 3000);
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
		var numbersToImport = parseCommaSeparatedNumbers(textToImport);
		console.log('cromos que serão importados:', numbersToImport);

		numbersToImport.forEach(function (n) {
			saveData(n, 1);
		});

		plotUserData();
		$('#importCromosBtnGrp').tooltip('show');
		setTimeout(()=> $('#importCromosBtnGrp').tooltip('hide'), 3000);
	});

	//Compara uma lista de números contra as que preciso
	$('#textToCompare').on('input', function compareCromosClick() {
		var textToCompare = $(this).val();
		var numbersToCompare = parseCommaSeparatedNumbers(textToCompare);
		console.log('cromos que serão comparados:', numbersToCompare);

		var missing = numbersToCompare.intersection(getFaltantes());
		$('#resultCompare').html('Preciso das seguintes: ' + missing.join(', '));
	});

	//Compara minhas repetidas contra uma lista de números
	$('#textToCompareMinhasRepetidas').on('input', function compareCromosClick() {
		var textToCompare = $(this).val();
		var numbersToCompare = parseCommaSeparatedNumbers(textToCompare);
		console.log('cromos que serão comparados:', numbersToCompare);

		var repetidas = numbersToCompare.intersection(getRepetidas());
		$('#resultCompareMinhasRepetidas').html('Posso te ajudar com estes números: ' + repetidas.join(', '));
	});


	$('.navbar-brand').click(function contagemClick() {
		exibirTooltipContagem();
	});


	$('#filtraFaltantes').on('change', function contagemClick() {
		filtraFaltantes = this.checked;
		plotUserData();
	});


	$('#filtraRepetidas').on('change', function contagemClick() {
		filtraRepetidas = this.checked;
		plotUserData();
	});


	$('#cleanRepetidas').on('click', function contagemClick() {
		if (confirm('Deseja limpar todas as repetidas?')) {
			console.log('Limpar repetidas.');
			userData.forEach((c)=>{c.value=c.value>1?1:c.value;});
			plotUserData();
			saveData();
		}
		else {
			console.log('Não limpar.');
		}
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
var filtraFaltantes = false;
var filtraRepetidas = false;


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

	executaFiltros();
	updateCounters();
}

function updateCounters() {
	var repetidas = $('#cromos .btn-cromo.btn-repetida').length;
	var faltantes = $('#cromos .btn-cromo:not(.btn-success):not(.btn-repetida)').length;
	$('#repetidasCount').html(repetidas);
	$('#faltantesCount').html(faltantes);
}

function executaFiltros() {
	if (filtraFaltantes || filtraRepetidas) {
		$('#cromos .btn-cromo').hide();
		filtraFaltantes && $('#cromos .btn-cromo:not(.btn-success):not(.btn-repetida)').show();
		filtraRepetidas && $('#cromos .btn-cromo.btn-repetida').show();
	}
	else {
		$('#cromos .btn-cromo').show();
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

function getEstruturaOrdenadaEContada() {
	return estrutura.sort((a,b)=>a.inicio-b.inicio).map(function (estr) {
		estr.possuidas = userData.filter(c=>c.id >= estr.inicio && c.id < estr.inicio+20 && c.value).length
		return estr
	})
}

var showTimer = null;
var showTime = 2000;
function exibirTooltipContagem() {

	if (showTimer) {
		clearTimeout(showTimer);
		showTimer = null;
		$('.navbar-brand').tooltip('hide');
	}
	else {
		var falta = getFaltantes().length;
		var total = $('#cromos .btn-cromo').length;
		var possui = total - falta;
		var repetidas = getRepetidas().length;
		var estrCountHtml = getEstruturaOrdenadaEContadaHtml();

		var texto = `Você possui <b>${possui}</b> cromos.<br>Faltam <b>${falta}</b> de <b>${total}</b> para completar.<br>Repetidas: <b>${repetidas}</b>${estrCountHtml}`;
		$('.navbar-brand').tooltip({html: true, title: 'calculando...', trigger:'manual', placement: 'bottom'}).tooltip('show');
		var tooltipElem = document.getElementById($('.navbar-brand').attr('aria-describedby'));
		$('.tooltip-inner', tooltipElem).html(texto).addClass('tooltip-contagem');
		showTimer = setTimeout(()=>{$('.navbar-brand').tooltip('hide'); showTimer=null}, showTime);
	}
	showTime = 60000; //aumenta o tempo de exibição depois da primeira exibição
}

function parseCommaSeparatedNumbers(textToParse) {
	var numbers = textToParse
							.split(/\s+/)
							.join(',')
							.replace(/,,/g,',')
							.split(',')
							.map(s=>parseInt(s))
							.filter(n=>n>=0&&n<=681);

	if (numbers.length == 0) {
		numbers = [parseInt(textToParse.trim())] //caso de uso: importar um único número
	}

	return numbers;
}

function getEstruturaOrdenadaEContadaHtml() {
	var estrCount = getEstruturaOrdenadaEContada();
	var html ='<div class="flags">';
	html += estrCount.map(function (estr) {
		var possuidas = estr.possuidas<10 ? '0'+estr.possuidas : estr.possuidas;
		return `<span class="flag"><img src="./assets/flags/${estr.id}.png" /> ${possuidas}</span>`;
	}).join('\n');
	html += '</div>';
	return html;
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

Array.prototype.intersection = function (a) {
	return this.filter(function(n) {
    	return a.indexOf(n) !== -1;
	});
}

if (typeof(console) == undefined) console = {log: s=>{} };
/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0
*/
var act = null;  // activity object, see initActivity()

function onError(message, source, lineno, colno, error) {
  alert(sformat('Σφάλμα προγραμματιστή!\n'
    + 'message: {}\nsource: {}\nlineno: {}\ncolno: {}\nerror: {}',
  message, source, lineno, colno, error));
}

// ES6 string templates don't work in old Android WebView
function sformat(format) {
  var args = arguments;
  var i = 0;
  return format.replace(/{(\d*)}/g, function sformatReplace(match, number) {
    i += 1;
    if (typeof args[number] !== 'undefined') {
      return args[number];
    }
    if (typeof args[i] !== 'undefined') {
      return args[i];
    }
    return match;
  });
}

// Return an integer from 0 to num-1.
function random(num) {
  return Math.floor(Math.random() * num);
}

// Return a shuffled array [0, ..., num-1].
// If differentIndex==true, make sure that array[i] != i.
function shuffledArray(num, differentIndex) {
  var result = [];
  var i;
  var j;
  var temp;

  // Fill the array with [0, ..., num-1]
  for (i = 0; i < num; i += 1) {
    result.push(i);
  }
  // Shuffle the array
  for (i = 0; i < num; i += 1) {
    j = random(num);
    temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  // Make sure that result[i] != i
  if (differentIndex) {
    for (i = 0; i < num; i += 1) {
      if (result[i] === i) {
        j = (i + 1) % num;
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
      }
    }
  }
  return result;
}

function ge(element) {
  return document.getElementById(element);
}

function setKeyframes(element, rule, duration) {
  var e = element;
  var i;
  var name = sformat('{}_animation', e.id);

  // The webkit* stuff is for old android webview versions
  e.style.animationName = '';
  e.style.webkitAnimationName = '';
  // First, delete the old animation for this element, if it exists
  for (i = 0; i < act.sheet.cssRules.length; i += 1) {
    if (act.sheet.cssRules[i].name === name) {
      act.sheet.deleteRule(i);
    }
  }
  // Now add the rule
  try {
    act.sheet.insertRule(sformat('@keyframes {} { {} }', name, rule), act.sheet.cssRules.length);
  } catch (err) {
    act.sheet.insertRule(sformat('@-webkit-keyframes {} { {} }', name, rule), act.sheet.cssRules.length);
  }
  void e.offsetWidth;  // https://css-tricks.com/restart-css-animation/
  // IE needs animationDuration before animationName
  e.style.animationDuration = duration || '2s';
  e.style.webkitAnimationDuration = e.style.animationDuration;
  e.style.animationName = name;
  e.style.webkitAnimationName = e.style.animationName;
}

function onResize(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;
  if (w / h < 640 / 360) {
    document.body.style.fontSize = sformat('{}px', 10 * w / 640);
  } else {
    document.body.style.fontSize = sformat('{}px', 10 * h / 360);
  }
}

function doPreventDefault(event) {
  event.preventDefault();
}

function onHome(event) {
  window.history.back();
}

function onHelp(event) {
  ge('help').style.display = 'flex';
  ge('helpaudio').play();
}

function onHelpHide(event) {
  ge('help').style.display = '';
}

function onAbout(event) {
  window.open('credits/index_DS_II.html');
}

function onFullScreen(event) {
  var doc = window.document;
  var docEl = doc.documentElement;
  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen
    || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen
    || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement
    && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}

function onPrevious(event) {
  initLevel(act.level - 1);
}

function onNext(event) {
  initLevel(act.level + 1);
}

function onWagonClick(event) {
  // w0 = 6em, w1 = 5em, g1 = 5em
  var i;
  var dx = (5 * (9 - act.giftsNum)) / 2 - 3.3;

  if (act.giftsNum === event.target.i) {
    for (i = act.giftsNum; i < act.wagons.length; i += 1) {
      setKeyframes(act.wagons[i], [
        '0% { opacity: 1; }',
        '10% { opacity: 0; }',
        '100% { opacity: 0; }'].join('\n'), '4s');
    }
    setKeyframes(ge('gifts'), [
      '0% { top: 5em; left: 0em; }',
      '45% { top: 15.5em; left: 0em; }',
      sformat('100% { top: 15.5em; left: {}em; }', -57 - dx)].join('\n'), '4s');
    setKeyframes(ge('train'), [
      '0% { left: 0em; }',
      sformat('35%, 45% { left: {}em; }', dx),
      '100% { left: -57em; }'].join('\n'), '4s');
    setTimeout(initLevel, 4000, act.level + 1);
  } else {
    setKeyframes(event.target, [
      'from { transform: rotateY(360deg); }',
      'to { transform: rotateY(0deg); }'].join('\n'), '1s');
  }
}

function initLevel(newLevel) {
  // Internal act.level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  var numLevels = 14;
  var min;
  var max;
  var oldNum = act.giftsNum;
  var i;
  var shufa = shuffledArray(9, false);

  act.level = (newLevel + numLevels) % numLevels;
  // Gifts per level (min…max):
  // 1…3, 1…3, 1…4, 2…4, 2…5, 2…5, 3…6, 3…6, 3…7, 4…7, 4…8, 4…8, 5…9, 5…9
  min = 1 + Math.floor(act.level / 3);
  max = 3 + Math.floor(act.level / 2);

  act.giftsNum = min + random(max - min + 1);
  // Avoid showing the same number of gifts in two subsequent levels
  if (oldNum === act.giftsNum) {
    if (act.giftsNum < max) {
      act.giftsNum += 1;
    } else {
      act.giftsNum -= 1;
    }
  }

  ge('level').innerHTML = act.level + 1;
  for (i = shufa.length - 1; i >= 0; i -= 1) {
    act.gifts[i].src = sformat('resource/g{}.svg', shufa[i] + 1);
    if (i < act.giftsNum) {
      act.gifts[i].style.display = '';
    } else {
      act.gifts[i].style.display = 'none';
    }
  }
  setKeyframes(ge('gifts'), 'from { top: -5em; }\nto { top: 5em; }');
  setKeyframes(ge('train'), 'from { left: 60em; }\nto { left: 0em; }');
}

function initActivity() {
  var i;

  act = {
    level: 0,
    giftsNum: -1,
    gifts: [],
    wagons: [],
    sheet: null,
  };
  for (i = 1; i <= 9; i += 1) {
    act.gifts.push(ge(sformat('g{}', i)));
    act.wagons.push(ge(sformat('w{}', i)));
    act.wagons[i - 1].onclick = onWagonClick;
    act.wagons[i - 1].i = i;
  }
  onResize();
  // Create a <style> element for animations, to avoid CORS issues on Chrome
  act.sheet = document.styleSheets[0];
  // TODO: dynamically? document.head.appendChild(document.createElement('style'));
  // Install event handlers
  document.body.onresize = onResize;
  document.body.oncontextmenu = doPreventDefault;
  ge('bar_home').onclick = onHome;
  ge('bar_help').onclick = onHelp;
  ge('help').onclick = onHelpHide;
  ge('bar_about').onclick = onAbout;
  ge('bar_fullscreen').onclick = onFullScreen;
  ge('bar_previous').onclick = onPrevious;
  ge('bar_next').onclick = onNext;
  for (i = 0; i < document.images.length; i += 1) {
    document.images[i].ondragstart = doPreventDefault;
  }
  initLevel(act.level);
}

window.onerror = onError;
window.onload = initActivity;
// Call onResize even before the images are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onResize);
} else {  // `DOMContentLoaded` already fired
  onResize();
}

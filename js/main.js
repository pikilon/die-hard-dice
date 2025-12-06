import { generateDice } from "./dice.js";



function dice_initialize(container = document.body) {
  document.getElementById("loading_text")?.remove();

  var canvas = document.getElementById("canvas");
  canvas.style.width = window.innerWidth - 1 + "px";
  canvas.style.height = window.innerHeight - 1 + "px";
  var label = document.getElementById("label");
  var set = document.getElementById("set");
  var selector_div = document.getElementById("selector_div");
  var info_div = document.getElementById("info_div");
  on_set_change();

  tealDice.dice.use_true_random = false;

  function on_set_change(ev) {
    set.style.width = set.value.length + 3 + "ex";
  }
  set.addEventListener("keyup", on_set_change);
  set.addEventListener("mousedown", function (ev) {
    ev.stopPropagation();
  });
  set.addEventListener("mouseup", function (ev) {
    ev.stopPropagation();
  });
  set.addEventListener("focus", function (ev) {
    container.setAttribute("class", "");
  });
  set.addEventListener("blur", function (ev) {
    container.setAttribute("class", "noselect");
  });

  var clearBtn = document.getElementById("clear");
  ["mouseup", "touchend"].forEach(function (evt) {
    clearBtn.addEventListener(evt, function (ev) {
      ev.stopPropagation();
      set.value = "0";
      on_set_change();
    });
  });

  var params = Object.fromEntries(new URLSearchParams(window.location.search));

  if (params.chromakey) {
    tealDice.dice.desk_color = 0x00ff00;
    info_div.style.display = "none";
    document.getElementById("control_panel").style.display = "none";
  }
  if (params.shadows == 0) {
    tealDice.dice.use_shadows = false;
  }
  if (params.color == "white") {
    tealDice.dice.dice_color = "#808080";
    tealDice.dice.label_color = "#202020";
  }

  var box = new tealDice.dice.dice_box(canvas, { w: 500, h: 300 });
  box.animate_selector = false;

  window.addEventListener("resize", function () {
    canvas.style.width = window.innerWidth - 1 + "px";
    canvas.style.height = window.innerHeight - 1 + "px";
    box.reinit(canvas, { w: 500, h: 300 });
  });

  function show_selector() {
    info_div.style.display = "none";
    selector_div.style.display = "inline-block";
    box.draw_selector();
  }

  function before_roll(vectors, notation, callback) {
    info_div.style.display = "none";
    selector_div.style.display = "none";
    // do here rpc call or whatever to get your own result of throw.
    // then callback with array of your result, example:
    // callback([2, 2, 2, 2]); // for 4d6 where all dice values are 2.
    callback();
  }

  function notation_getter() {
    return tealDice.dice.parse_notation(set.value);
  }

  function after_roll(notation, result) {
    if (params.chromakey || params.noresult) return;
    var res = result.join(" ");
    if (notation.constant) {
      if (notation.constant > 0) res += " +" + notation.constant;
      else res += " -" + Math.abs(notation.constant);
    }
    if (result.length >= 1)
      res +=
        " = " +
        (result.reduce(function (s, a) {
          return s + a;
        }) +
          notation.constant);
    label.innerHTML = res;
    info_div.style.display = "inline-block";
  }

  box.bind_mouse(container, notation_getter, before_roll, after_roll);
  box.bind_throw(
    document.getElementById("throw"),
    notation_getter,
    before_roll,
    after_roll
  );

  ["mouseup", "touchend"].forEach(function (evt) {
    container.addEventListener(evt, function (ev) {
      ev.stopPropagation();
      if (selector_div.style.display == "none") {
        if (!box.rolling) show_selector();
        box.rolling = false;
        return;
      }
      var name = box.search_dice_by_mouse(ev);
      if (name != undefined) {
        var notation = tealDice.dice.parse_notation(set.value);
        notation.set.push(name);
        set.value = tealDice.dice.stringify_notation(notation);
        on_set_change();
      }
    });
  });

  if (params.notation) {
    set.value = params.notation;
  }
  if (params.roll) {
    document
      .getElementById("throw")
      .dispatchEvent(new Event("mouseup", { bubbles: true, cancelable: true }));
  } else {
    show_selector();
  }
}
tealDice.dice = new generateDice();
dice_initialize();

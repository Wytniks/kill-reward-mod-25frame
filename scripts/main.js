Events.on(ClientLoadEvent, e => {

    Vars.netClient.addPacketHandler("drop-text", cons(packet => {

        var data = JSON.parse(packet);

        var map = new ObjectMap();

        data.items.forEach(function(d){
            var item = Vars.content.getByName(ContentType.item, d.name);
            if(item){
                map.put(item, d.amount);
            }
        });

        var myTeam = Vars.player != null ? Vars.player.team() : null;
        var deadTeam = Team.get(data.team);

        if(myTeam != null && deadTeam === myTeam) return;
        if(isTextEnabled()){
            showDropText(data.x, data.y, map);
        }
    }));

});

const {GlyphLayout} = Packages.arc.graphics.g2d;

let floatingTexts = [];

function showDropText(x, y, drops){
    if(!drops || drops.size === 0) return;

    floatingTexts.push({
        x: x,
        y: y,
        drops: drops,
        time: 0
    });
}


function isDropEnabled(){
    return Core.settings.getBool("drop_enabled", true);
}

function isTextEnabled(){
    return Core.settings.getBool("drop_text_enabled", true);
}


function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getMul(key){
    return Core.settings.getInt(key, 1);
}

// ===== ДЕФОЛТЫ =====
var defaultDrops = {
    // SERPULO
    1: { scrap:[1,7], copper:[1,8], lead:[1,4] },
    2: { scrap:[3,9], copper:[3,12], lead:[3,12] },
    3: { copper:[10,35], lead:[10,35], graphite:[2,7] },
    4: { copper:[20,45], lead:[20,45], silicon:[10,25], graphite:[12,30], metaglass:[10,20] },
    5: { titanium:[80,150], thorium:[40,60], silicon:[40,60], graphite:[50,100], metaglass:[25,50] },

    // EREKIR
    6: { beryllium:[5,20] },
    7: { beryllium:[5,20], graphite:[5,10] },
    8: { beryllium:[10,20], graphite:[10,15], silicon:[4,8] },
    9: { beryllium:[20,30], graphite:[20,25], silicon:[15,20], thorium:[10,15], tungsten:[20,40] },
    10:{ beryllium:[40,100], graphite:[30,80], silicon:[20,60], thorium:[20,50], tungsten:[40,80], carbide:[15,20] }
};

Events.run(EventType.Trigger.draw, () => {

    for(let i = floatingTexts.length - 1; i >= 0; i--){
        let t = floatingTexts[i];

        t.time += Time.delta;

        t.y += 0.3 * Time.delta;

        let alpha = 1 - (t.time / 150);

        if(alpha <= 0){
            floatingTexts.splice(i, 1);
            continue;
        }

        let font = Fonts.outline;

        let oldScaleX = font.getData().scaleX;
        let oldScaleY = font.getData().scaleY;

        font.getData().setScale(0.3);

        font.setColor(1, 1, 1, alpha);

        Draw.color(1, 1, 1, alpha);

        let offsetX = 0;
        let layout = new GlyphLayout();

        t.drops.each(function(item, amount){
            if(amount <= 0) return;

            let str = "+" + amount;

            layout.setText(font, str);
            let textWidth = layout.width;

            font.draw(str, t.x + offsetX, t.y);

            Draw.rect(item.uiIcon, t.x + offsetX + textWidth + 4, t.y, 8, 8);

            offsetX += textWidth + 12;
        });
        font.getData().setScale(oldScaleX, oldScaleY);
        font.setColor(1, 1, 1, 1);
    }

    Draw.color();
});

function getDropValue(tier, item, type){
    var key = "drop_t" + tier + "_" + item.name + "_" + type;

    if(Core.settings.has(key)){
        return Core.settings.getInt(key);
    }

    var def = defaultDrops[tier];
    if(def && def[item.name]){
        return type === "min" ? def[item.name][0] : def[item.name][1];
    }

    return 0;
}

// ================= UI =================


Events.on(ClientLoadEvent, function(){

    let dropButton = null;

    var dialog = new BaseDialog("Drop Settings");

    var tabs = new Table();
    var content = new Table();
    var scroll = new ScrollPane(content);

    dialog.cont.add(tabs).row();
    dialog.cont.add(scroll).grow().row();

    function showPage(func){
        content.clear();
        func(content);
    }

        function buildSettings(table){

        function addCheck(label, key, def){

            let check = new CheckBox(label);
            check.update(() => {
                check.setChecked(Core.settings.getBool(key, def));
            });

            check.changed(() => {
                Core.settings.put(key, check.isChecked());
            });

            table.add(check).left().row();
        }

        table.add("=== GENERAL SETTINGS ===").color(Color.sky).row();

        addCheck("Enable resource drops (host only)", "drop_enabled", true);

        addCheck("Show drop text (client-side)", "drop_text_enabled", true);

    table.button("Reset Button Position", () => {

        let x = 345;
        let y = Core.graphics.getHeight() - 40;

        Core.settings.put("drop_btn_x", new java.lang.Integer(x));
        Core.settings.put("drop_btn_y", new java.lang.Integer(y));

        if(dropButton != null){
            dropButton.setPosition(x, y);
        }

    }).width(250).height(50).row();

    }

    

    // ===== MULTIPLIERS =====
    function buildMultipliers(table){

        function addPreview(t, item, tier, mul){
            var min = getDropValue(tier, item, "min");
            var max = getDropValue(tier, item, "max");

            if(max <= 0) return;

            t.image(item.uiIcon).size(20);

            if(min === max){
                t.add(" " + (min * mul)).left();
            }else{
                t.add(" " + (min * mul) + " - " + (max * mul)).left();
            }

            t.row();
        }

        function addField(table, label, key, tier){

            table.add(label).left().row();

            var preview = new Table();
            table.add(preview).left().row();

            function update(val){
                preview.clear();

                if(val === 0){
                    preview.add("No drop");
                    return;
                }

                Vars.content.items().each(function(item){
                    addPreview(preview, item, tier, val);
                });
            }

            var field = new TextField(getMul(key) + "");

            field.setFilter(new TextField.TextFieldFilter({
                acceptChar: function(f, c){
                    if(!java.lang.Character.isDigit(c)) return false;
                    return String(f.getText()).length < 3;
                }
            }));

            field.changed(function(){
                var val = parseInt(field.getText());
                if(!isNaN(val)){
                    Core.settings.put(key, new java.lang.Integer(val));
                    update(val);
                }
            });

            table.add(field).width(120).row();

            update(getMul(key));
            table.row();
        }

        var left = new Table();
        var right = new Table();

        // SERPULO
        left.add("=== SERPULO ===").color(Color.gray).row();
        for(var i = 1; i <= 5; i++){
            addField(left, "Tier " + i, "mul_t" + i, i);
        }

        // EREKIR
        right.add("=== EREKIR ===").color(Color.orange).row();
        for(var i = 6; i <= 10; i++){
            addField(right, "Tier " + (i-5), "mul_t" + i, i);
        }

        table.add(left).top().padRight(40);
        table.add(right).top();
    }

    // ===== EDITOR =====
    function buildEditor(table){

        function addMinMax(t, item, tier){

            t.image(item.uiIcon).size(24);
            t.add(item.localizedName).left();

            var minKey = "drop_t" + tier + "_" + item.name + "_min";
            var maxKey = "drop_t" + tier + "_" + item.name + "_max";

            var minField = new TextField(getDropValue(tier, item, "min") + "");
            var maxField = new TextField(getDropValue(tier, item, "max") + "");

            function filter(f){
                f.setFilter(new TextField.TextFieldFilter({
                    acceptChar: function(tf, c){
                        if(!java.lang.Character.isDigit(c)) return false;
                        return String(tf.getText()).length < 4;
                    }
                }));
            }

            filter(minField);
            filter(maxField);

            minField.changed(function(){
                var v = parseInt(minField.getText());
                if(!isNaN(v)) Core.settings.put(minKey, new java.lang.Integer(v));
            });

            maxField.changed(function(){
                var v = parseInt(maxField.getText());
                if(!isNaN(v)) Core.settings.put(maxKey, new java.lang.Integer(v));
            });

            t.add(" Min:");
            t.add(minField).width(70);

            t.add(" Max:");
            t.add(maxField).width(70).row();
        }

        // SERPULO
        table.add("=== SERPULO ===").color(Color.gray).row();
        for(var tier = 1; tier <= 5; tier++){
            table.add("Tier " + tier).left().row();

            Vars.content.items().each(function(item){
                addMinMax(table, item, tier);
            });

            table.row();
        }

        // EREKIR
        table.add("=== EREKIR ===").color(Color.orange).row();
        for(var tier = 6; tier <= 10; tier++){
            table.add("Tier " + (tier-5)).left().row();

            Vars.content.items().each(function(item){
                addMinMax(table, item, tier);
            });

            table.row();
        }
    }

    tabs.button("Multipliers", function(){
        showPage(buildMultipliers);
    }).size(160, 50);

    tabs.button("Editor", function(){
        showPage(buildEditor);
    }).size(160, 50);

    tabs.button("Settings", function(){
    showPage(buildSettings);
    }).size(160, 50);

    showPage(buildMultipliers);

    dialog.addCloseButton();

    // ===== buttons =====

    // menu
    Vars.ui.menufrag.addButton("Drop Rewards", Icon.units, function() {
        dialog.show();
    });

    // game

    function getBtnX(){
        return Core.settings.getInt("drop_btn_x", 345);
    }

    function getBtnY(){
        return Core.settings.getInt("drop_btn_y", Core.graphics.getHeight() - 40);
    }

    function setBtnPos(x, y){
    Core.settings.put("drop_btn_x", new java.lang.Integer(Mathf.floor(x)));
    Core.settings.put("drop_btn_y", new java.lang.Integer(Mathf.floor(y)));
    }

    Vars.ui.hudGroup.fill(cons(root => {

        let cont = new Table();
        cont.setFillParent(true);

        let btn = new ImageButton(Icon.units, Styles.cleari);
        dropButton = btn;
        btn.clicked(() => dialog.show());

    btn.setSize(50);

        // начальная позиция
        btn.setPosition(getBtnX(), getBtnY());

        let lastX = 0;
        let lastY = 0;

        btn.addListener(new JavaAdapter(InputListener, {

            touchDown: function(event, x, y, pointer, button){
                lastX = x;
                lastY = y;
                return true;
            },

            touchDragged: function(event, x, y, pointer){
                let dx = x - lastX;
                let dy = y - lastY;

                btn.moveBy(dx, dy);
                setBtnPos(btn.x, btn.y);
            }

        }));

        cont.addChild(btn);
        root.addChild(cont);
    }));
});
// ================= ЛОГИКА =================
function getDrop(tier, item){
    var min = getDropValue(tier, item, "min");
    var max = getDropValue(tier, item, "max");

    if(max <= 0) return 0;

    return randomRange(min, max);
}

Events.on(UnitDestroyEvent, function(event){

    if(!isDropEnabled()) return;

    if(Vars.net.client()) return;

    var unit = event.unit;
    if(!unit) return;

    var deadTeam = unit.team;

    var tier = -1;
    var name = unit.type.name;

    // SERPULO
    if (["dagger","crawler","mono","nova","flare","risso","retusa"].includes(name)) tier = 1;
    else if (["mace","pulsar","atrax","poly","minke","horizon","oxynoe"].includes(name)) tier = 2;
    else if (["fortress","quasar","spiroct","zenith","mega","bryde","cyerce"].includes(name)) tier = 3;
    else if (["scepter","vela","arkyid","antumbra","quad","sei","aegires"].includes(name)) tier = 4;
    else if (["reign","corvus","toxopid","eclipse","oct","omura","navanax"].includes(name)) tier = 5;

    // EREKIR
    else if (["elude","merui","stell"].includes(name)) tier = 6;
    else if (["avert","cleroi","locus"].includes(name)) tier = 7;
    else if (["obviate","anthicus","precept"].includes(name)) tier = 8;
    else if (["quell","tecta","vanquish"].includes(name)) tier = 9;
    else if (["disrupt","collaris","conquer"].includes(name)) tier = 10;

    if(tier === -1) return;

    var m = getMul("mul_t" + tier);
    if(m === 0) return;

    var dropMap = new ObjectMap();
    var sendArray = [];

    Vars.content.items().each(function(item){

        var min = getDropValue(tier, item, "min");
        var max = getDropValue(tier, item, "max");

        if(max <= 0) return;

        var amount = Mathf.random(min, max + 1);
        amount = Math.floor(amount) * m;

        if(amount > 0){
            dropMap.put(item, amount);

            sendArray.push({
                name: item.name,
                amount: amount
            });
        }

    });

    Vars.state.teams.active.each(function(teamData){

        if(teamData.team === deadTeam) return;

        var core = teamData.core();
        if(!core) return;

    dropMap.each(function(item, amount){

        var current = core.items.get(item);
        var capacity = core.block.itemCapacity;

        var space = capacity - current;
        if(space <= 0) return;

        var toAdd = Math.min(space, amount);

        core.items.add(item, toAdd);
    });

    });

    var packet = JSON.stringify({
        x: unit.x,
        y: unit.y,
        team: deadTeam.id, 
        items: sendArray
    });

    Call.clientPacketReliable("drop-text", packet);

    var myTeam = Vars.player != null ? Vars.player.team() : null;

    if(myTeam == null || deadTeam !== myTeam){
        if(isTextEnabled()){
        showDropText(unit.x, unit.y, dropMap);
        }
    }
});

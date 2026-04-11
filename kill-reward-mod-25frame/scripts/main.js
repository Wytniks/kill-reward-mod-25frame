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

    showPage(buildMultipliers);

    dialog.addCloseButton();

    Vars.ui.menufrag.addButton("Drop", Icon.settings, function() {
        dialog.show();
    });
});

// ================= ЛОГИКА =================
function getDrop(tier, item){
    var min = getDropValue(tier, item, "min");
    var max = getDropValue(tier, item, "max");

    if(max <= 0) return 0;

    return randomRange(min, max);
}

Events.on(UnitDestroyEvent, function(event){

    if(Vars.net.client()) return;

    var unit = event.unit;
    if(!unit) return;

    var deadTeam = unit.team;
    var tier = -1;
    var name = unit.type.name;

    // SERPULO
    if (["dagger","crawler","nova","flare","horizon"].includes(name)) tier = 1;
    else if (["mace","atrax","risso","mono","poly"].includes(name)) tier = 2;
    else if (["fortress","spiroct","minke","megas","quasar"].includes(name)) tier = 3;
    else if (["scepter","toxopid","bryde","oct","vela"].includes(name)) tier = 4;
    else if (["reign","omura","corvus","navanax","cultivator"].includes(name)) tier = 5;

    // EREKIR
    else if (["elude","merui","stell"].includes(name)) tier = 6;
    else if (["avert","cleroi","locus"].includes(name)) tier = 7;
    else if (["obviate","anthicus","precept"].includes(name)) tier = 8;
    else if (["quell","tecta","vanquish"].includes(name)) tier = 9;
    else if (["disrupt","collaris","conquer"].includes(name)) tier = 10;

    // нет в списке - нет дропа
    if(tier === -1) return;

    var m = getMul("mul_t" + tier);
    if(m === 0) return;

    Vars.state.teams.active.each(function(teamData){

        if(teamData.team === deadTeam) return;

        var core = teamData.core();
        if(!core) return;

        Vars.content.items().each(function(item){

            var amount = getDrop(tier, item) * m;
            if(amount > 0){
                core.items.add(item, amount);
            }

        });

    });
});
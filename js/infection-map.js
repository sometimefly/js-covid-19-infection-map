var sidebar = new ol.control.Sidebar({
    element: 'sidebar',
    position: 'right'
});
var jsonFiles, filesLength, fileKey = 0;

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}

var dataPool = {};
$.getJSON('data/meta.json', {}, function(c) {
    $('#Confirmed').html(c.Confirmed);
    $('#Recovered').html(c.Recovered);
    $('#Deaths').html(c.Deaths);
    var target = c.end.toString();
    var targetFile = 'data/china/' + target.substring(0, 4) + '/' + target + '.json';
    $.getJSON(targetFile, {}, function(d) {
        dataPool = d;
        china.setSource(sourcePool[currentAdm]);
    });

    var pointSource = new ol.source.Vector({
        url: 'data/points/' + c.points + '.json',
        format: new ol.format.GeoJSON()
    });
    points.setSource(pointSource);
});

var taiwanData = {};
var taiwanCode = {
    '台北市': 'A',
    '台中市': 'B',
    '基隆市': 'C',
    '台南市': 'D',
    '高雄市': 'E',
    '新北市': 'F',
    '宜蘭縣': 'G',
    '桃園市': 'H',
    '嘉義市': 'I',
    '新竹縣': 'J',
    '苗栗縣': 'K',
    '南投縣': 'M',
    '彰化縣': 'N',
    '新竹市': 'O',
    '雲林縣': 'P',
    '嘉義縣': 'Q',
    '屏東縣': 'T',
    '花蓮縣': 'U',
    '台東縣': 'V',
    '金門縣': 'W',
    '澎湖縣': 'X',
    '連江縣': 'Z'
};
$.getJSON('raw/taiwan/Weekly_Age_County_Gender_19CoV.json', {}, function(c) {
    for (k in c) {
        var code = taiwanCode[c[k].縣市];
        if (!taiwanData[code]) {
            taiwanData[code] = {
                count: 0,
                cases: []
            }
        }
        taiwanData[code]['count'] += parseInt(c[k].確定病例數);
        taiwanData[code].cases.push(c[k]);
    }
    taiwan.setSource(sourceTaiwan);
});

var getChinaStyle = function(f) {
    var p = f.getProperties();
    var codeKey = 'ADM' + currentAdm + '_PCODE';
    var code = p[codeKey];
    var confirmedCount = 0;
    var lv = 'lv0';
    var theStyle;
    if (currentAdm == '2') {
        if (dataPool['adm2'][code]) {
            confirmedCount = dataPool['adm2'][code]['confirmedCount'];
            if (confirmedCount > 499) {
                lv = 'lv5';
            } else if (confirmedCount > 299) {
                lv = 'lv4';
            } else if (confirmedCount > 99) {
                lv = 'lv3';
            } else if (confirmedCount > 9) {
                lv = 'lv2';
            } else if (confirmedCount > 0) {
                lv = 'lv1';
            }
        }
        theStyle = styleLv[lv].clone();
        theStyle.getText().setText(p.ADM1_ZH + p.ADM2_ZH + '(' + confirmedCount + ')');
    } else {
        code = p.ADM1_ZH;
        if (dataPool['adm1'][code]) {
            confirmedCount = dataPool['adm1'][code]['confirmedCount'];
            if (confirmedCount > 1000) {
                lv = 'lv5';
            } else if (confirmedCount > 499) {
                lv = 'lv4';
            } else if (confirmedCount > 99) {
                lv = 'lv3';
            } else if (confirmedCount > 9) {
                lv = 'lv2';
            } else if (confirmedCount > 0) {
                lv = 'lv1';
            }
        }
        theStyle = styleLv[lv].clone();
        theStyle.getText().setText(p.ADM1_ZH + '(' + confirmedCount + ')');
    }
    f.setProperties({
        'lv': lv,
        'confirmedCount': confirmedCount
    });
    return theStyle;
}

var getTaiwanStyle = function(f) {
    var p = f.getProperties();
    var lv = 'tw_lv1';
    var theStyle;
    var confirmedCount = 0;
    if (taiwanData[p.COUNTYID]) {
        confirmedCount = taiwanData[p.COUNTYID].count;
        if (confirmedCount > 6) {
            lv = 'tw_lv5';
        } else if (confirmedCount > 2) {
            lv = 'tw_lv4';
        } else if (confirmedCount > 1) {
            lv = 'tw_lv3';
        } else if (confirmedCount > 0) {
            lv = 'tw_lv2';
        }
    }
    theStyle = styleLv[lv].clone();
    theStyle.getText().setText(p.COUNTYNAME + '(' + confirmedCount + ')');
    f.setProperties({
        'lv': lv,
        'confirmedCount': confirmedCount
    });
    return theStyle;
}

var pointStylePool = {};
var getPointStyle = function(f) {
    var p = f.getProperties();
    var pointStyle;
    var radiusSize = 3;
    var fillColor = new ol.style.Fill({
        color: 'rgba(255,0,0,0.5)'
    });
    if (p.Confirmed < 10) {
        radiusSize = 3;
    } else if (p.Confirmed < 50) {
        radiusSize = 7;
    } else if (p.Confirmed < 100) {
        radiusSize = 11;
    } else if (p.Confirmed < 200) {
        radiusSize = 15;
    } else if (p.Confirmed < 300) {
        radiusSize = 19;
    } else if (p.Confirmed < 500) {
        radiusSize = 23;
    } else {
        radiusSize = p.Confirmed / 300;
        if (radiusSize < 27) {
            radiusSize = 27;
        } else {
            radiusSize = 80;
            fillColor = new ol.style.Fill({
                color: 'rgba(0,0,0,0.5)'
            })
        }
    }
    if (!pointStylePool[radiusSize]) {
        pointStylePool[radiusSize] = new ol.style.Style({
            image: new ol.style.Circle({
                radius: radiusSize,
                fill: fillColor
            }),
        });
    }
    pointStyle = pointStylePool[radiusSize];
    return pointStyle;
}

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.9820179, 23.9739374]),
    zoom: 7
});

var raster = new ol.layer.Tile({
    source: new ol.source.OSM()
});
var sourcePool = {};

sourcePool['1'] = new ol.source.Vector({
    url: 'json/adm1.json',
    format: new ol.format.TopoJSON()
});

sourcePool['2'] = new ol.source.Vector({
    url: 'json/adm2.json',
    format: new ol.format.TopoJSON()
});

var currentAdm = '2';

var china = new ol.layer.Vector({
    source: null,
    style: getChinaStyle
});
var sourceTaiwan = new ol.source.Vector({
    url: 'json/taiwan.json',
    format: new ol.format.TopoJSON()
});
var taiwan = new ol.layer.Vector({
    source: null,
    style: getTaiwanStyle
});
var points = new ol.layer.Vector({
    source: null,
    style: getPointStyle
});
var map = new ol.Map({
    layers: [raster, china, taiwan, points],
    target: 'map',
    view: appView
});
var lastFeature = false;
map.addControl(sidebar);
map.on('singleclick', function(evt) {
    content.innerHTML = '';
    pointClicked = false;

    var message = '';
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        var p = feature.getProperties();
        if (false !== lastFeature) {
            var lastP = lastFeature.getProperties();
            if (lastP.ADM1_ZH) {
                lastFeature.setStyle(getChinaStyle(lastFeature));
                lastFeature = false;
            } else if (lastP.COUNTYID) {
                lastFeature.setStyle(getTaiwanStyle(lastFeature));
                lastFeature = false;
            }
        }
        if (p.ADM1_ZH) {
            message += '<table class="table table-dark">';
            message += '<tbody>';
            if (currentAdm == '2') {
                if (dataPool['adm2'][p.ADM2_PCODE]) {
                    message += '<tr><th scope="row">區域</th><td>' + p.ADM1_ZH + p.ADM2_ZH + '</td></tr>';
                    message += '<tr><th scope="row">確診</th><td>' + dataPool['adm2'][p.ADM2_PCODE]['confirmedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">疑似</th><td>' + dataPool['adm2'][p.ADM2_PCODE]['suspectedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">治癒</th><td>' + dataPool['adm2'][p.ADM2_PCODE]['curedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">死亡</th><td>' + dataPool['adm2'][p.ADM2_PCODE]['deadCount'] + '</td></tr>';
                }
                sidebarTitle.innerHTML = p.ADM1_ZH + p.ADM2_ZH;
            } else {
                if (dataPool['adm1'][p.ADM1_ZH]) {
                    message += '<tr><th scope="row">區域</th><td>' + p.ADM1_ZH + '</td></tr>';
                    message += '<tr><th scope="row">確診</th><td>' + dataPool['adm1'][p.ADM1_ZH]['confirmedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">疑似</th><td>' + dataPool['adm1'][p.ADM1_ZH]['suspectedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">治癒</th><td>' + dataPool['adm1'][p.ADM1_ZH]['curedCount'] + '</td></tr>';
                    message += '<tr><th scope="row">死亡</th><td>' + dataPool['adm1'][p.ADM1_ZH]['deadCount'] + '</td></tr>';
                }
                sidebarTitle.innerHTML = p.ADM1_ZH;
            }
            message += '<tr><th scope="row">資料來源</th><td><a href="https://3g.dxy.cn/newh5/view/pneumonia" target="_blank">丁香园</a></td></tr>';
            message += '</tbody></table>';
            pointClicked = true;

            var theStyle = styleLv[p.lv].clone();
            if (currentAdm == '2') {
                theStyle.getText().setText(p.ADM1_ZH + p.ADM2_ZH + '(' + p.confirmedCount + ')');
            } else {
                theStyle.getText().setText(p.ADM1_ZH + '(' + p.confirmedCount + ')');
            }
            theStyle.setStroke(clickStroke);
            feature.setStyle(theStyle);
            lastFeature = feature;
        } else if (p.COUNTYID) {
            var messageTitle = 'Taiwan - ' + p.COUNTYNAME + ' ' + p.COUNTYENG;
            message += '<table class="table table-dark">';
            message += '<tbody>';
            message += '<tr><th scope="row">區域</th><td>' + messageTitle + '</td></tr>';
            message += '<tr><th scope="row">確診</th><td>' + p.confirmedCount + '</td></tr>';
            if (taiwanData[p.COUNTYID]) {
                console.log(taiwanData[p.COUNTYID]);
                message += '<tr><td colspan="2"><ul>';
                for (k in taiwanData[p.COUNTYID].cases) {
                    var caseText = taiwanData[p.COUNTYID].cases[k]['發病年份'] + '年';
                    caseText += '第' + taiwanData[p.COUNTYID].cases[k]['發病週別'] + '週';
                    caseText += '確診' + taiwanData[p.COUNTYID].cases[k]['確定病例數'] + '名';
                    if (taiwanData[p.COUNTYID].cases[k]['性別'] === 'F') {
                        caseText += '女性，';
                    } else {
                        caseText += '男性，';
                    }
                    caseText += taiwanData[p.COUNTYID].cases[k]['年齡層'] + '歲，';
                    if (taiwanData[p.COUNTYID].cases[k]['是否為境外移入'] === '是') {
                        caseText += '境外移入';
                    } else {
                        caseText += '境內感染';
                    }
                    message += '<li>' + caseText + '</li>';
                }
                message += '</ul></td></tr>';
            }
            message += '<tr><th scope="row">資料來源</th><td><a href="https://nidss.cdc.gov.tw/ch/NIDSS_DiseaseMap.aspx?dc=1&dt=5&disease=19cov" target="_blank">傳染病統計資料查詢系統</a></td></tr>';
            message += '</tbody></table>';
            sidebarTitle.innerHTML = messageTitle;

            var theStyle = styleLv[p.lv].clone();
            theStyle.getText().setText(p.COUNTYNAME + '(' + p.confirmedCount + ')');
            theStyle.setStroke(clickStroke);
            feature.setStyle(theStyle);
            lastFeature = feature;
        }
        if (p.Confirmed) {
            if (p['Last Update (UTC)']) {
                p['Last Update'] = p['Last Update (UTC)'];
            }
            message += '<table class="table table-dark">';
            message += '<tbody>';
            message += '<tr><th scope="row">國家／地區</th><td>' + p['Country/Region'] + '</td></tr>';
            message += '<tr><th scope="row">省／州</th><td>' + p['Province/State'] + '</td></tr>';
            message += '<tr><th scope="row">確診</th><td>' + p.Confirmed + '</td></tr>';
            message += '<tr><th scope="row">治癒</th><td>' + p.Recovered + '</td></tr>';
            message += '<tr><th scope="row">死亡</th><td>' + p.Deaths + '</td></tr>';
            message += '<tr><th scope="row">更新時間</th><td>' + p['Last Update'] + '</td></tr>';
            message += '<tr><th scope="row">資料來源</th><td><a href="https://systems.jhu.edu/research/public-health/ncov/" target="_blank">JHU CSSE</a></td></tr>';
            sidebarTitle.innerHTML = p['Province/State'] + ',' + p['Country/Region'];
            message += '</tbody></table>';
        }
    });
    content.innerHTML = message;
    sidebar.open('home');
});

var lvStroke = new ol.style.Stroke({
    color: 'rgba(37,67,140,0.5)',
    width: 1
});
var clickStroke = new ol.style.Stroke({
    color: 'rgba(255,0,0,0.7)',
    width: 3
});
var lvText = new ol.style.Text({
    font: 'bold 16px "Open Sans", "Arial Unicode MS", "sans-serif"',
    fill: new ol.style.Fill({
        color: 'blue'
    })
});
var styleLv = {};
styleLv['lv0'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(255,255,255,0.1)'
    })
});
styleLv['lv1'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(240,143,127,0.5)'
    })
});
styleLv['lv2'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(226,96,97,0.5)'
    })
});
styleLv['lv3'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(195,69,72,0.5)'
    })
});
styleLv['lv4'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(156,47,49,0.5)'
    })
});
styleLv['lv5'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(115,25,25,0.5)'
    })
});
styleLv['tw_lv1'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(0,102,0,0.7)'
    })
});
styleLv['tw_lv2'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(153,204,0,0.7)'
    })
});
styleLv['tw_lv3'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(255,255,118,0.7)'
    })
});
styleLv['tw_lv4'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(255,153,0,0.7)'
    })
});
styleLv['tw_lv5'] = new ol.style.Style({
    stroke: lvStroke,
    text: lvText,
    fill: new ol.style.Fill({
        color: 'rgba(204,51,51,0.7)'
    })
});

$('#btnAdm1').click(function() {
    currentAdm = '1';
    china.setSource(sourcePool[currentAdm]);
    sidebar.close();
    $('a.btn-adm').each(function(k, obj) {
        if ($(obj).attr('id') === 'btnAdm1') {
            $(obj).removeClass('btn-secondary');
            $(obj).addClass('btn-primary');
        } else {
            $(obj).removeClass('btn-primary');
            $(obj).addClass('btn-secondary');
        }
    });
    return false;
});

$('#btnAdm2').click(function() {
    currentAdm = '2';
    china.setSource(sourcePool[currentAdm]);
    sidebar.close();
    $('a.btn-adm').each(function(k, obj) {
        if ($(obj).attr('id') === 'btnAdm2') {
            $(obj).removeClass('btn-secondary');
            $(obj).addClass('btn-primary');
        } else {
            $(obj).removeClass('btn-primary');
            $(obj).addClass('btn-secondary');
        }
    });
    return false;
});

var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');
// 来个闭包，免得污染全局变量。
(function (require) {
    //当前权限actions
    let permissionActions = [];
    let setting = {};

    //获取系统配置
    function initSetting($) {
        setting = getSetting();
    }

    //初始化平台信息
    function initPlatformInfo($) {
        let platformLogo = setting.platform_logo || 'fa fa-fort-awesome';
        let platformName = setting.platform_name || '后台系统';
        if (platformLogo.length > 0) {
            $(".platform-logo").attr("class", platformLogo);
        }
        if (platformName.length > 0) {
            $(".platform-name").text(platformName);
        }
    }

    // 初始化边栏展开收起功能。
    function initAsideToggle($) {
        const layout = $('.a-Layout');

        $('#aside-toggler').on('click', function () {
            const $i = $('>i', this);
            const isFolded = $i.hasClass('fa-indent');

            if (isFolded) {
                layout.removeClass('a-Layout--folded');
                $i.removeClass('fa-indent').addClass('fa-dedent');
            } else {
                layout.addClass('a-Layout--folded');
                $i.removeClass('fa-dedent').addClass('fa-indent');
            }
        });
    }

    // 初始化导航展开效果。
    function initNavClick($) {
        $(document.body).on('click', '.a-AsideNav-item', function () {
            const $item = $(this).closest('.a-AsideNav-item');
            const isOpen = $item.hasClass('is-open');

            if (isOpen) {
                $item.removeClass('is-open');
            } else {
                $item.addClass('is-open');
            }
            return false;
        });
    }

    function initNavMenu($) {
        $.ajax({
            async: false,
            url: pageSchemaApi + '/api/v1/pub/current/menutree',
            type: "GET",
            dataType: "json", //指定服务器返回的数据类型
            //cache: false,
            beforeSend: function (request) {
                request.setRequestHeader("authorization", getAuthorization());
            },
            success: function (response) {
                let locationHash = window.location.hash;
                let menuNavHtml = '<li class="a-AsideNav-label"><span>导航</span></li>';
                let list = response.list;
                for (let i in list) {
                    let menuItem = list[i];
                    let arrowHtml = '<span class="a-AsideNav-itemArrow"></span>';
                    if (menuItem.children == undefined) {
                        arrowHtml = '';
                    }
                    let menuItemRoute = menuItem.router;

                    let menuItemActions = menuItem.actions;  //存储权限actions列表
                    if (menuItemActions != undefined) {
                        for (let i in menuItemActions) {
                            let actionsCode = menuItemActions[i].code;
                            permissionActions.push(menuItemRoute + "::" + actionsCode);
                        }
                    }

                    let isOpen = '';
                    if (menuItemRoute && locationHash.indexOf(menuItemRoute) !== -1) { //检查当前菜单路由是否满足
                        isOpen = 'is-open';
                    } else { //检查子菜单是否满足
                        if (menuItem.children != undefined) {
                            for (let i in menuItem.children) {
                                let firstChildrenItem = menuItem.children[i];
                                let firstChilerenItemRouter = firstChildrenItem.router;
                                let firstChar = firstChilerenItemRouter.substr(0, 1);
                                if (firstChar !== '/') {
                                    firstChilerenItemRouter = '/'.firstChilerenItemRouter;
                                }


                                let firstChildrenItemActions = firstChildrenItem.actions;  //存储权限actions列表
                                if (firstChildrenItemActions != undefined) {
                                    for (let i in firstChildrenItemActions) {
                                        let firstChildrenActionsCode = firstChildrenItemActions[i].code;
                                        permissionActions.push(firstChilerenItemRouter + "::" + firstChildrenActionsCode);
                                    }
                                }

                                if (firstChilerenItemRouter && locationHash.indexOf(firstChilerenItemRouter) !== -1) {
                                    isOpen = 'is-open';
                                    break;
                                }
                            }
                        }
                    }

                    let icon = menuItem.icon || "";
                    if (arrowHtml === '') {
                        menuNavHtml += '<li class="a-AsideNav-item ' + isOpen + '">' +
                            '<a href="/#' + menuItem.router + '" class="nav-menu">' +
                            '   <i class="a-AsideNav-itemIcon ' + icon + '"></i>' +
                            '   <span class="a-AsideNav-itemLabel">' + menuItem.name + '</span>' +
                            '</a>';
                        '</li>';
                    } else {
                        menuNavHtml += '<li class="a-AsideNav-item ' + isOpen + '">' +
                            '<a>' + arrowHtml +
                            '   <i class="a-AsideNav-itemIcon ' + icon + '"></i>' +
                            '   <span class="a-AsideNav-itemLabel">' + menuItem.name + '</span>' +
                            '</a>';
                        if (menuItem.children != undefined) {
                            menuNavHtml += '<ul class="a-AsideNav-subList">';
                            for (let i in menuItem.children) {
                                let firstChildrenItem = menuItem.children[i];
                                let firstChilerenItemRouter = firstChildrenItem.router;
                                let firstChar = firstChilerenItemRouter.substr(0, 1);
                                if (firstChar !== '/') {
                                    firstChilerenItemRouter = '/'.firstChilerenItemRouter;
                                }

                                let isOpen = '';
                                if (firstChilerenItemRouter && locationHash.indexOf(firstChilerenItemRouter) !== -1) {
                                    isOpen = 'is-open is-active';
                                }

                                menuNavHtml += '    <li class="a-AsideNav-item ' + isOpen + '">';
                                menuNavHtml += '    <a href="/#' + firstChilerenItemRouter + '" class="nav-menu">';
                                menuNavHtml += '        <i class="a-AsideNav-itemIcon ' + firstChildrenItem.icon + '"></i>';
                                menuNavHtml += '        <span class="a-AsideNav-itemLabel">' + firstChildrenItem.name + '</span>';
                                menuNavHtml += '    </a>';
                                menuNavHtml += '    </li>';
                            }
                            menuNavHtml += '</ul>';
                        }
                        menuNavHtml += '</li>';
                    }
                }
                $("#nav-menu").html(menuNavHtml);

                //触发当前选中的点击
                $("#nav-menu").find("[href='/" + locationHash + "']").trigger('click');
            }
        });
    }

    //点击菜单加载page数据
    function initMenuClick($) {
        let globalEnv = {};
        if (setting.global_env !== undefined) {
            for (let i in setting.global_env) {
                let globalEnvItem = setting.global_env[i];
                globalEnv[globalEnvItem.key] = globalEnvItem.value;
            }
        }
        $(document.body).on('click', '.nav-menu', function () {
            let amis = amisRequire("amis/embed");
            let page = $(this).attr("href").substring(2) || 'main';
            window.location.hash = page;
            amis.embed("#main", {
                type: "service",
                schemaApi: "get:" + pageSchemaApi + "/api/v1/page_manager/route?route=" + page + "&_monitor=$_page_name",
                initFetchSchema: true
            }, {
                "data": {
                    "_authorization": getAuthorization(),
                    "_page_name": page,
                    "_app_id": getAppId(),
                    "_page_schema_api": pageSchemaApi,
                    "_global_env": globalEnv,
                    "acl": {
                        "can": (...permissions) => {
                            for (let i in permissionActions) {
                                for (let j in permissions) {
                                    if (permissions[j] === permissionActions[i]) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        }
                    }
                }
            }, {
                updateLocation: (location, replace) => {
                    console.log("updateLocation", location, replace)
                },
                jumpTo: to => {
                    //console.log("jumpTo", to)
                    window.location.replace(to);
                }
            });

            const $topItem = $(this).closest('.a-AsideNav-list').find('.a-AsideNav-item');
            $topItem.removeClass('is-active');

            $(this).closest('.a-AsideNav-item').addClass('is-active');
        })
    }

    //判断用户是否登录
    function checkLogin($) {
        let pathname = window.location.pathname;
        if (pathname === "/page/preview.html") { //预览页面不判断登录
            return;
        }
        $.ajax({
            async: false,    //表示请求是否异步处理
            type: "get",    //请求类型
            url: pageSchemaApi + "/api/v1/pub/current/user",//请求的 URL地址
            beforeSend: function (request) {
                request.setRequestHeader("authorization", getAuthorization());
            },
            dataType: "json",//返回的数据类型
            success: function (response) {
                let userId = response.user_id || "";
                let userName = response.user_name || "";
                if (userId.length <= 0 && userName.length <= 0) {
                    let appId = getAppId();
                    if (appId != defaultAppId) {
                        window.location.href = "/login.html?app_id=" + appId;
                    } else {
                        window.location.href = "/login.html";
                    }
                } else {
                    store.session("user", response);
                    let userName = response.user_name + '(' + response.real_name + ')';
                    let amis = amisRequire("amis/embed");
                    amis.embed("#toolbar", {
                        "type": "page",
                        "body": [
                            {
                                "label": userName,
                                "type": "button",
                                "className": "user-name toolbar",
                                "actionType": "dialog",
                                "dialog": {
                                    "title": "修改个人密码",
                                    "body": {
                                        "type": "form",
                                        "api": {
                                            "url": pageSchemaApi + "/api/v1/pub/current/password",
                                            "method": "put",
                                            "headers": {
                                                "Authorization": getAuthorization()
                                            },
                                            "requestAdaptor": "api.data.old_password = md5(api.data.old_password);api.data.new_password = md5(api.data.new_password);return api",
                                            "adaptor": "{if (payload.error != undefined){payload.data = {};payload.status=payload.error.code;payload.msg=payload.error.message;} else { payload.data = {};payload.status=0;payload.msg='';} return payload;}"
                                        },
                                        "controls": [
                                            {
                                                "type": "password",
                                                "name": "old_password",
                                                "label": "旧密码",
                                                "required": true
                                            },
                                            {
                                                "type": "password",
                                                "name": "new_password",
                                                "label": "新密码",
                                                "required": true
                                            },
                                            {
                                                "type": "password",
                                                "name": "confirm_new_password",
                                                "label": "确认新密码",
                                                "required": true,
                                                "validations": "equalsField:new_password",
                                            },
                                        ]
                                    }
                                }
                            },
                            {
                                "label": "退出",
                                "type": "button",
                                "level": "info",
                                "className": "toolbar",
                                "actionType": "ajax",
                                "api": {
                                    "url": pageSchemaApi + "/api/v1/pub/login/exit",
                                    "method": "post",
                                    "headers": {
                                        "Authorization": getAuthorization()
                                    },
                                    "adaptor": "{if (payload.error != undefined){payload.data = {};payload.status=payload.error.code;payload.msg=payload.error.message;} else { payload.data = {};payload.status=0;payload.msg=''; return payload;}}"
                                },
                                "redirect": "/login.html"
                            }
                        ]
                    })
                }
            },
            error: function (response) {
                alert("登录失效，请重新登录");
                let appId = getAppId();
                if (appId != defaultAppId) {
                    window.location.href = "/login.html?app_id=" + appId;
                } else {
                    window.location.href = "/login.html";
                }
            }
        });
    }

    //初始化源码查看
    function initSourceClick($) {
        $(document.body).on('click', '#view-page-source', function () {
            let locationHash = window.location.hash;
            let page = locationHash.substring(1);
            $.ajax({
                async: false,    //表示请求是否异步处理
                type: "get",    //请求类型
                url: pageSchemaApi + "/api/v1/page_manager/route?route=" + page,
                beforeSend: function (request) {
                    request.setRequestHeader("authorization", getAuthorization());
                },
                dataType: "json",//返回的数据类型
                success: function (response) {
                    if (response.status == undefined || response.status != 0) {
                        return;
                    }
                    let source = response.data;
                    let amis = amisRequire("amis/embed");
                    amis.embed("#view-page-source", {
                        "type": "page",
                        "body": [
                            {
                                "type": "html",
                                "className": "goto-github",
                                "visibleOn": "acl.can('/tools/page_manager::view')",
                                "html": "<a href='https://github.com/tanjiancheng/gin-amis-admin' target='_blank'><i class='fa fa-github'></i></a>"
                            },
                            {
                                "type": "button",
                                "icon": "fa fa-code",
                                "className": "view-page-source",
                                "actionType": "drawer",
                                "visibleOn": "acl.can('/tools/page_manager::view')",
                                "drawer": {
                                    "position": "left",
                                    "size": "lg",
                                    "resizable": true,
                                    "body": {
                                        "title": "",
                                        "type": "form",
                                        "controls": [
                                            {
                                                "type": "json-editor",
                                                "name": "json",
                                                "label": false,
                                                "size": "xxl",
                                                "className": "h-full",
                                                "value": source
                                            }
                                        ]
                                    },
                                    "submitText": null,
                                    "actions": []
                                }
                            },
                            {
                                "type": "html",
                                "className": "view-page-source",
                                "visibleOn": "acl.can('/tools/page_manager::view')",
                                "html": "<span class=\"inline v-middle text-info\">←点击这里查看源码</span>"
                            }
                        ]
                    }, {
                        "data": {
                            "_authorization": getAuthorization(),
                            "_page_name": page,
                            "_page_schema_api": pageSchemaApi,
                            "_app_id": getAppId(),
                            "acl": {
                                "can": (...permissions) => {
                                    for (let i in permissionActions) {
                                        for (let j in permissions) {
                                            if (permissions[j] === permissionActions[i]) {
                                                return true;
                                            }
                                        }
                                    }
                                    return false;
                                }
                            }
                        }
                    });
                }
            });
        });
        $("#view-page-source").trigger('click');
    }


    //判断应用是否初始化
    function checkAppInit($) {
        $.ajax({
            async: true,
            url: pageSchemaApi + '/api/v1/app/' + getAppId(),
            type: "GET",
            dataType: "json", //指定服务器返回的数据类型
            //cache: false,
            beforeSend: function (request) {
                request.setRequestHeader("authorization", getAuthorization());
            },
            success: function (response) {
                let isInitApp = response.data;
                if (response.data === undefined) {
                    isInitApp = false;
                }
                if (!isInitApp) {
                    window.location.href = "/page/wizard.html";
                }
            }
        })
    }


    // 也可以通过其他方式加载 jQuery
    require(["jquery"], function ($) {
        initSetting($);
        checkAppInit($);
        initPlatformInfo($);
        initAsideToggle($);
        initNavClick($);
        initMenuClick($);
        initNavMenu($);
        initSourceClick($);
        checkLogin($);
    });


})(amisRequire);
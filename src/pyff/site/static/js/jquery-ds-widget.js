jQuery(function ($) {
    $.widget("pyff.discovery_client", {

        options: {
            sp_entity_id: undefined,
            discovery_service_storage_url: undefined,
            discovery_service_search_url: undefined,
            discovery_service_list_url: undefined,
            before: undefined,
            after: undefined,
            render: undefined,
            render_search_result: undefined,
            render_saved_choice: undefined,
            fallback_icon: undefined,
            search_result_selector: '#pyff-search-list',
            saved_choices_selector: '#pyff-saved-choices',
            selection_selector: '.identityprovider',
            on_show: undefined,
            on_hide: undefined
        },

        _create: function () {
            var obj = this;
            if (typeof obj.options['render'] !== 'function') {
                obj._template = Hogan.compile('<div data-href="{{entity_id}}" class="identityprovider list-group-item">' +
                    '{{^sticky}}<button type="button" alt="{{ _(\"Remove from list\") }}" data-toggle="tooltip" data-placement="left" class="close">&times;</button>{{/sticky}}' +
                    '<div class="media"><div class="d-flex mr-3"><div class="frame-round">' +
                    '<div class="crop"><img{{#entity_icon}} src="{{entity_icon}}"{{/entity_icon}} data-id={{entity_id}} class="pyff-idp-icon"/></div></div></div>' +
                    '<div class="media-body"><h5 class="mt-0 mb-1">{{title}}</h5>{{#descr}}{{descr}}{{/descr}}</div>' +
                    '</div></div>');

                obj.options['render'] = function (item) {
                    item.selection_class = obj.selection_class;
                    return obj._template.render(item);
                }
            }
            if (typeof obj.options['render_search_result'] != 'function') {
                obj.options['render_search_result'] = obj.options['render'];
            }
            if (typeof obj.options['render_saved_choice'] != 'function') {
                obj.options['render_saved_choice'] = obj.options['render'];
            }
            if (typeof obj.options['fallback_icon'] != 'function') {
                obj.options['fallback_icon'] = $.noop;
            }
            if (typeof obj.options['on_show'] != 'function') {
                obj.options['on_show'] = $.noop;
            }
            if (typeof obj.options['on_hide'] != 'function') {
                obj.options['on_hide'] = $.noop;
            }
            obj._update();
        },

        _setOption: function (key, value) {
            this.options[key] = value;
            this._update();
        },

        _after: function (count) {
            var saved_choices_element = $(this.options['saved_choices_selector']);
            if (typeof this.options['after'] == 'function') {
                return this.options['after'](count, saved_choices_element);
            } else {

                if (this.discovery_service_search_url) {
                    var obj = this;
                    var search_result_element = $(obj.options['search_result_selector']);
                    var search_base, search_related, list_uri;
                    search_base = obj.element.attr('data-search');
                    search_related = obj.element.attr('data-related');
                    $(obj.input_field_selector).focus();
                    search_result_element.btsListFilter(obj.input_field_selector, {
                        resetOnBlur: false,
                        itemEl: '.identityprovider',
                        emptyNode: obj.options['no_results'],
                        onShow: obj.options['on_show'],
                        onHide: obj.options['on_hide'],
                        getValue: function(that) {
                            var v = that.val();
                            var i = v.indexOf('@');
                            return i > 0 ? v.substr(i) : v;
                        },
                        sourceData: function (text, callback) {
                            var remote = search_base + "?query=" + text + "&entity_filter={http://macedir.org/entity-category}http://pyff.io/category/discoverable";

                            if (search_related) {
                                remote = remote + "&related=" + search_related;
                            }
                            return $.getJSON(remote, callback);
                        },
                        sourceNode: function (data) {
                            data.sticky = true;
                            return obj.options['render_search_result'](data);
                        },
                        cancelNode: null
                    });
                }
                if (count == 0) {
                    $("#searchwidget").show();
                    $("#addwidget").hide();
                } else {
                    $("#searchwidget").hide();
                    $("#addwidget").show();
                }
            }
        },

        _update: function () {
            var obj = this;
            obj.discovery_service_storage_url = obj.options['discovery_service_storage_url'] || obj.element.attr('data-store');
            obj.sp_entity_id = obj.options['sp_entity_id'] || obj.element.attr('data-href');
            obj.discovery_service_search_url = obj.options['discovery_service_search_url'] || obj.element.attr('data-search');
            obj.mdq_url = obj.options['mdq_url'] || obj.element.attr('data-mdq');
            obj.input_field_selector = obj.options['input_field_selector'] || obj.element.attr('data-inputfieldselector') || 'input';
            obj.selection_selector = obj.options['selection_selector'];
            obj._ds = new DiscoveryService(obj.mdq_url, obj.discovery_service_storage_url, obj.sp_entity_id);
            var top_element = obj.element;

            $('img.pyff-idp-icon').bind('error', function () {
                $(this).unbind('error');
                obj.options['fallback_icon'](this);
            });

            $('body').on('mouseenter', obj.selection_selector, function (e) {
                $(this).addClass("active");
            });
            $('body').on('mouseleave', obj.selection_selector, function (e) {
                $(this).removeClass("active");
            });

            $('body').on('click', obj.selection_selector, function (e) {
                var entity_id = $(this).closest(obj.selection_selector).attr('data-href');
                console.log(entity_id);
                return obj._ds.saml_discovery_response(entity_id);
            });

            $(obj.input_field_selector).closest('form').submit(function(e) {
                e.preventDefault();
            });

            $('body').on('click', '.close', function (e) {
                e.stopPropagation();
                var entity_element = $(this).closest(obj.selection_selector);
                var entity_id = entity_element.attr('data-href');
                if (entity_id) {
                    obj._ds.remove(entity_id).then(function () {
                        entity_element.remove();
                    });
                }
            });

            obj._ds.choices().then(function (entities) {
                if (typeof obj.options['before'] === 'function') {
                    entities = obj.options['before'](entities);
                }
                return entities;
            }).then(function (entities) {
                var count = 0;
                var saved_choices_element = $(obj.options['saved_choices_selector']);
                entities.forEach(function (item) {
                    var entity_element = obj.options['render_saved_choice'](item.entity);
                    saved_choices_element.prepend(entity_element);
                    count++;
                });
                return count;
            }).then(function (count) {
                obj._after(count);
            })
        }

    })
})
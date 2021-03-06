PeeringDB = {
  is_mobile : /Android|WebOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  js_enabled : function() {
    return this.is_mobile ? false : true;
  },
  advanced_search_result : {
    net : {},
    fac : {},
    ix : {}
  },
  init : function() {
    this.InlineSearch.init_search();

    twentyc.listutil.filter_input.init();
    twentyc.listutil.sortable.init();

    this.csrf = Cookies.get("csrftoken")

    $.ajaxSetup({
      beforeSend : function(xhr, settings) {
        if(!/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type) && !this.crossDomain) {
          xhr.setRequestHeader("X-CSRFToken", PeeringDB.csrf);
        }
      }
    });

    $('#form-create-account').on('export', function(e, data) {
      data.recaptcha = grecaptcha.getResponse();
    });

    this.fix_list_offsets();

    $('.sponsor-badge').after().click(function(e) {
      // only redirect while not in edit mode
      if($(this).parents('.mode-edit').length == 0)
        window.location.href = "/sponsors";
    });

    $('.translate-btn').click(function(e){
      $(this).closest('.fmt_text').find('.popin').remove();
      var note_o = $(this).closest('.fmt_text').find('p');
      var ps = [];
      note_o.each(function(i,o){
        ps.push($(o).text());
      });
      var note = ps.join(' xx22xx ');
      var source = ''; //$('select[name="language-to"]').val();
      var tgt = ''; //$('select[name="language-to"]').val();
      $.post('translate', 'note=' + note + '&target=' + tgt + '&source=' + source)
       .done(function(reply){
          if('undefined' != typeof(reply.error)){
              var message = ('undefined' != typeof(reply.error.error))? reply.error.error.message : JSON.stringify(reply.error);
              note_o.parent().append( '<div class="editable popin error">' + message + '</div>')
              return;
          }
          if('undefined' == typeof(reply.translation) || 'undefined' == typeof(reply.translation.translatedText)){
              note_o.parent().append( '<div class="editable popin error">Unknown error</div>')
              console.log(reply);
              return;
          }
          var translation = reply.translation.translatedText.split(' xx22xx ').join('</p><p>');
          note_o.parent().append( '<div class="editable popin info"><p>' + translation + '</p></div>')
          console.log(translation);
       })
       .fail(function(a,b,c){
         console.log(a,b,c);
       });
    });

  },

  // fix list x offsets depending on whether content is overflowing
  // or not - as it gets pushed over by scrollbars
  fix_list_offsets : function() {
    $('.scrollable').each(function() {
      if(this.clientHeight >= this.scrollHeight && $(this).children().length>1) {
        $(this).css("padding-right", "15px");
        $(this).find(".empty-result").css("margin-right", "-15px");
      } else {
        $(this).css("padding-right", "");
        $(this).find(".empty-result").css("margin-right", "");
      }
    });
  },

  // some api listings have an external form to create new items
  // this function takes care of linking the form up with the listing
  // module
  list_ext_add : function(form, listing) {
    form.on('action-success:submit', function(ev, data) {
      var instance = listing.data('edit-module-instance')
      instance.listing_add(
        data.id,
        $(this),
        instance.container,
        data
      )
      // clear any error popins on form
      $(this).editable('clear-error-popins');
      // reset the form
      $(this).editable('reset');
    });
  },

  pretty_speed : function(value) {
    value = parseInt(value);
    if(value >= 1000000)
      value = (value / 1000000)+"T";
    else if(value >= 1000)
      value = (value / 1000)+"G";
    else
      value = value+"M";
    return value
  },

  // searches the page for all editable forms that
  // have data-check-incomplete attribute set and
  // displays a notification if any of the fields
  // are blank

  incomplete_data_notify : function() {
    $('[data-check-incomplete="Yes"]').each(function() {
      var status = { incomplete : false};
      $(this).find('[data-edit-name]').each(function() {
        var value = $(this).html().trim();
        var name = $(this).data("edit-name");
        var field = $(this).prev('.view_field');
        if(!field.length)
          field = $(this).parent().prev('.view_field');
        var check = (field.find('.incomplete').length == 1);
        if(check && (value == "" || value == "0")) {
          status.incomplete = true;
          field.find('.incomplete').removeClass("hidden")
        } else {
          field.find('.incomplete').addClass("hidden")
        }
      })

      if(status.incomplete) {
        $(this).find('.editable.popin.incomplete').removeClass("hidden").show();
      } else {
        $(this).find('.editable.popin.incomplete').addClass("hidden").hide();
      }
    });
  }
}

function moveCursorToEnd(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}

PeeringDB.IXFPreview = {

  /**
   * Handle the IX-F import preview request and rendering
   * to UI modal
   *
   * @class IXFPreview
   * @namespace PeeringDB
   */

  request : function(ixlanId, renderTo) {

    /**
     * request a preview for the ixlan with ixlanId
     *
     * @method request
     * @param {Number} ixlanId
     * @param {jQuery} renderTo - render to this element (needs to have
     *    the appropriate children elements to work, they are not
     *    created automatically)
     */

    renderTo.find('.ixf-result').empty().
      append($("<div>").addClass("center").text("... loading ..."));
    renderTo.find('.ixf-error-counter').empty();
    $.get('/import/ixlan/'+ixlanId+'/ixf/preview', function(result) {
      this.render(result, renderTo);
    }.bind(this)).error(function(result) {
      if(result.responseJSON) {
        this.render(result.responseJSON, renderTo);
      } else {
        this.render({"non_field_errors": ["HTTP error "+result.status]});
      }
    }.bind(this));
  },

  render : function(result, renderTo) {

    /**
     * Render preview result and errors
     *
     * @method render
     * @param {Object} result - result as returned from the preview request
     * @param {jQuery} renderTo
     *
     *    Needs to have child divs with the following classes
     *
     *
     *    .ixf-errors-list: errors will be rendered to here
     *    .ixf-result: changes will be rendered to here
     *    .ixf-error-counter: will be updated with number of errors
     *
     */

    renderTo.find('.ixf-errors-list').empty()
    renderTo.find('.ixf-result').empty()
    this.render_errors((result.errors || []).concat(result.non_field_errors || []), renderTo.find('.ixf-errors-list'));
    this.render_data(result.data || [], renderTo.find('.ixf-result'));
  },

  render_errors : function(errors, renderTo) {
    /**
     * Render the errors, called automatically by `render`
     *
     * @method render_errors
     * @param {Array} errors
     * @param {jQuery} renderTo
     */

    var error, i;

    if(!errors.length)
      return;

    $('.ixf-error-counter').text("("+errors.length+")");

    for(i = 0; i < errors.length; i++) {
      error = errors[i];
      renderTo.append($('<div>').addClass("ixf-error").text(error));
    }
  },

  render_data : function(data, renderTo) {
    /**
     * Renders the changes made by the ix-f import, called automatically
     * by `render`
     *
     * @method render_data
     * @param {Array} data
     * @param {jQuery} renderTo
     */

    var row, i;
    for(i = 0; i < data.length; i++) {
      row = data[i];
      renderTo.append(
        $('<div>').addClass("row ixf-row ixf-"+row.action).append(
          $('<div>').addClass("col-sm-1").text(row.action),
          $('<div>').addClass("col-sm-2").text("AS"+row.peer.asn),
          $('<div>').addClass("col-sm-3").text(row.peer.ipaddr4 || "-"),
          $('<div>').addClass("col-sm-3").text(row.peer.ipaddr6 || "-"),
          $('<div>').addClass("col-sm-1").text(PeeringDB.pretty_speed(row.peer.speed)),
          $('<div>').addClass("col-sm-2").text(row.peer.is_rs_peer?"yes":"no"),
          $('<div>').addClass("col-sm-12 ixf-reason").text(row.reason)
        )
      );
    }
  }

}

PeeringDB.InlineSearch = {

  init_search : function() {
    if(this.initialized)
      return

    $('#search').keypress(function(e) {
      if(e.which == 13) {
        window.document.location.href= "/search?q="+$(this).val()
        e.preventDefault();
      }
    });

    $('#search').keyup(function(e) {
      PeeringDB.InlineSearch.search($(this).val());
    });

    this.searchResult = $('#search-result');
    this.searchContainer = $('#inline-search-container');
    this.contentContainer = $('#content');

    this.initialized = true;
  },

  search : function(value) {

    if(!value || value.length < 3) {
      if(this.searchContainer.is(":visible")) {
        this.searchContainer.hide();
        this.contentContainer.show();
      }
      return;
    }

    if(this.busy) {
      this.queuedSearch = value;
      return;
    }

    this.busy = true;
    $.get(
      "/api_search",
      { q : value },
      function(data) {
        var val;

        if(typeof data == 'string')
          data = JSON.parse(data)


        twentyc.data.load("sponsors", {callback:function() {
          PeeringDB.InlineSearch.apply_result(data)
          PeeringDB.InlineSearch.busy = false
          if(val=PeeringDB.InlineSearch.queuedSearch) {
            PeeringDB.InlineSearch.queuedSearch = null;
            PeeringDB.InlineSearch.search(val);
          }
        }.bind(this)});
      }
    )

  },

  apply_result : function(data) {
    var i, row, rowNode, type, resultNodes = PeeringDB.InlineSearch.resultNodes;

    var count = 0;

    for(type in data) {
      if(!this.resultNodes)
        this.resultNodes = {};
      if(!this.resultNodes[type]) {
        this.resultNodes[type] = {
          rl : $("#search-result-length-"+type),
          lst : $("#search-result-"+type)
        }
      }

      this.resultNodes[type].rl.html(data[type].length);
      this.resultNodes[type].lst.empty()
      for(i in data[type]) {
        count++;
        row = data[type][i];
        rowNode = $(document.createElement("div"))
        rowNode.addClass("result_row")
        rowNode.append($('<a>').attr("href", "/"+type+"/"+row.id).text(row.name));

        var sponsor = (twentyc.data.get("sponsors")[row.org_id] || {}).name;
        if(sponsor) {
          rowNode.append($('<a>').
            attr("href", "/sponsors").
            addClass("sponsor "+sponsor).
            text(sponsor+" sponsor"));
        }

        this.resultNodes[type].lst.append(rowNode)
      }
    }

    if(!this.searchContainer.is(":visible") && $('#search').val().length > 2) {
      this.searchContainer.show();
      this.contentContainer.hide();
    }

  }

}

/**
 * api request
 */

PeeringDB.API = {
  request : function(method, ref, id, data, success) {

    var url = "/api/"+ref;
    if(id)
       url += "/"+id

    var prepared;
    if(data) {
      if(method.toLowerCase() == "get")
        prepared = data;
      else
        prepared = JSON.stringify(data);
    }

    return $.ajax(
      {
        url : url,
        method : method,
        contentType : 'application/json',
        data : prepared,
        dataType : 'json',
        success : success
      }
    );

  },
  get : function(ref, id, success) {
    return this.request("GET", ref, id, null, function(r) {
      if(success) {
        success(r.data[0], r);
      }
    });
  },
  list : function(ref, success) {
    return this.request("GET", ref, 0, null, success);
  }
}

/**
 * editable uoar management endpoint
 */

twentyc.editable.module.register(
  "uperm_listing",
  {
    loading_shim : true,
    PERM_UPDATE : 0x02,
    PERM_CREATE : 0x04,
    PERM_DELETE : 0x08,

    init : function() {
      this.listing_init();
      this.container.on("listing:row-add", function(e, rowId, row, data, me) {
        row.editable("payload", {
          user_id : data.user_id,
          org_id : data.org_id
        })
      });
    },

    org_id : function() {
      return this.container.data("edit-id");
    },
    user_id : function() {
      return this.container.data("edit-user-id");
    },
    prepare_data : function(extra) {
      var perms = 0;
      if(this.target.data.perm_u)
        perms |= this.PERM_UPDATE;
      if(this.target.data.perm_c)
        perms |= this.PERM_CREATE;
      if(this.target.data.perm_d)
        perms |= this.PERM_DELETE;
      this.target.data.perms = perms;
      if(extra)
        $.extend(this.target.data, extra);
    },

    add : function(rowId, trigger, container, data) {

      var i, labels = twentyc.data.get("permissions");

      for(i=0; i<labels.length; i++) {
        if(labels[i].id == data.entity) {
          data.entity = labels[i].name;
          break;
        }
      }

      data.perm_u = ((data.perms & this.PERM_UPDATE) == this.PERM_UPDATE)
      data.perm_c = ((data.perms & this.PERM_CREATE) == this.PERM_CREATE)
      data.perm_d = ((data.perms & this.PERM_DELETE) == this.PERM_DELETE)

      var row = this.listing_add(rowId, trigger, container, data);
    },

    execute_add : function(trigger, container) {
      this.components.add.editable("export", this.target.data);
      var data = this.target.data;
      this.prepare_data();
      this.target.execute("update", this.components.add, function(response) {
        this.add(data.entity, trigger, container, data);
      }.bind(this));
    },

    execute_remove : function(trigger, container) {
      this.components.add.editable("export", this.target.data);
      var data = this.target.data;
      var row = this.row(trigger);
      this.prepare_data({perms:0, entity:row.data("edit-id")});
      this.target.execute("remove", trigger, function(response) {
        this.listing_execute_remove(trigger, container);
      }.bind(this));
    },

    submit : function(rowId, data, row, trigger, container) {
      this.target.data = data;
      this.prepare_data({entity:rowId});
      this.target.execute("update", row, function() {
        this.listing_submit(rowId, data, row, trigger, container);
      }.bind(this));
    },

    load : function(userId) {
      var me = this; target = this.get_target();
      if(!userId) {
        me.clear();
        return;
      }
      this.container.data("edit-user-id", userId);
      target.data= {"user_id":userId, "org_id":this.org_id()}
      target.execute(null, null, function(data) {
        me.clear();
        for(k in data.user_permissions) {
          var perms = {};
          perms.perms = data.user_permissions[k];
          perms.entity = k;
          me.add(k, null, me.container, perms);
        };
      });
    }

  },
  "listing"
);

twentyc.editable.module.register(
  "user_listing",
  {
    loading_shim : true,
    org_id : function() {
      return this.container.data("edit-id");
    },

    remove : function(id, row, trigger, container) {
      var b = confirm(gettext("Remove") + " " +row.data("edit-label"));  ///
      var me = this;
      $(this.target).on("success", function(ev, data) {
        if(b)
          me.listing_remove(id, row, trigger, container);
      });
      if(b) {
        this.target.data = { user_id : id, org_id : this.org_id() };
        this.target.execute("delete");
      } else {
        $(this.target).trigger("success", [gettext("Canceled")]);  ///
      }
    },
    submit : function(rowId, data, row, trigger, container) {
      this.target.data = data;
      this.target.data.org_id = this.org_id();
      this.target.data.user_id = rowId;
      this.target.execute("update", row, function() {
        this.listing_submit(rowId, data, row, trigger, container);
      }.bind(this));
    },


  },
  "listing"
);


twentyc.editable.module.register(
  "uoar_listing",
  {
    execute_approve : function(trigger, container) {
      var row = trigger.closest("[data-edit-id]").first()

      var b = confirm(gettext("Add user") + " " +row.data("edit-label")+ " " + gettext("to Organization?")); ///
      if(!b)
        return;

      this.target.data = {id:row.data("edit-id")};

      container.editable("export", this.target.data);
      this.target.execute("approve", row, function(data) {
        row.detach()
        var user_listing = $('#org-user-manager').data("edit-module-instance")
        row.data("edit-label", data.full_name)
        user_listing.add(data.id, row, user_listing.container, data)
      });
    },
    execute_deny : function(trigger, container) {
      var row = trigger.closest("[data-edit-id]").first()

      var b = confirm(gettext("Deny") +" "+row.data("edit-label")+"'s " + gettext("request to join the Organization?"));  ///
      if(!b)
        return;

      this.target.data = {id:row.data("edit-id")};
      container.editable("export", this.target.data);
      this.target.execute("deny", row, function(data) {
        row.detach();
      });
    }
  },
  "base"
);

/**
 * editable advanced_search endpoint
 */

twentyc.editable.target.register(
  "advanced_search",
  {
    execute : function() {
      var i, data = this.data_clean(true);
      data.reftag = this.args[1]
      for(i in data) {
        if(data[i] && data[i].join)
          data[i] = data[i].join(",")
      }
      window.location.replace(
        '?'+$.param(data)
      );
    },
    search : function() {
      var reftag = this.args[1];
      var data = this.data_clean(true);
      var me = $(this), mod=this, sender = this.sender, i;

      for(i in data) {
        if(typeof data[i] == "object" && data[i].join) {
          data[i] = data[i].join(",")
        }
      }

      data.limit = this.limit || 250;
      data.depth = 1;

      //console.log("Advanced Search", data);

      sender.find('.results-empty').hide();
      sender.find('.results-cutoff').hide();

      PeeringDB.advanced_search_result[reftag] = {"param": $.param(data), data : []}

      PeeringDB.API.request(
        "GET",
        reftag,
        null,
        data,
        function(r) {

          me.trigger("success", r.data);

          var resultNode = sender.find('.results').first()
          resultNode.empty();

          if(!r.data.length) {
            sender.find('.results-empty').show();
          } else {
            if(r.data.length == data.limit) {
              sender.find('.results-cutoff').show();
            }
            var row, i, d;
            for(i in r.data) {
              d = r.data[i];

              if(typeof mod["finalize_data_"+reftag] == "function") {
                mod["finalize_data_"+reftag](d);
              }

              row = twentyc.editable.templates.copy("advanced-search-"+reftag+"-item")

              if(d.sponsorship) {
                $('<a>').
                  attr("href", "/sponsors").
                  addClass("sponsor "+d.sponsorship).
                  text(d.sponsorship.toLowerCase()+" sponsor").
                  insertAfter(row.find('.name'));
              }

              row.find("[data-edit-name]").each(function(idx) {
                var fld = $(this);
                var value = d[fld.data("edit-name")]
                var sortValue = value;

                // if field has a sort-target specified get value for sorting
                // from there instead
                if(fld.data("sort-target")) {
                  sortValue = d[fld.data("sort-target")];
                }
                fld.data("sort-value", typeof sortValue == "string" ? sortValue.toLowerCase() : sortValue);
                fld.text(value);
                if(this.tagName == "A") {
                  fld.attr("href", fld.attr("href").replace("$id", d.id));
                }
              });
              resultNode.append(row);
            }
            sender.sortable("sortInitial");
          }
          PeeringDB.advanced_search_result[reftag].data = r.data
        }
      ).fail(function(response) {
        twentyc.editable.target.error_handlers.http_json(response, me, sender);
      });

    },

    finalize_data_net : function(data) {
      data.ix_count = data.netixlan_set.length;
      data.fac_count = data.netfac_set.length;
      data.info_traffic_raw = twentyc.data.get("traffic_speed_by_label")[data.info_traffic] || 0;
      data.sponsorship = (twentyc.data.get("sponsors")[data.org_id] || {}).name;
    },

    finalize_data_ix : function(data) {
      data.sponsorship = (twentyc.data.get("sponsors")[data.org_id] || {}).name;
    },

    finalize_data_fac : function(data) {
      data.sponsorship = (twentyc.data.get("sponsors")[data.org_id] || {}).name;
    }
  },
  "base"
);

/**
 * editable api endpoint
 */

twentyc.editable.target.register(
  "api",
  {
    execute : function() {
      var endpoint = this.args[1]
      var requestType = this.args[2]
      var method = "POST"

      var button = $(this.sender.context);

      if(this.context) {
        var sender = this.context;
      } else {
        var sender = this.sender;
      }

      var me = $(this),
          data = this.data,
          id = parseInt(this.data._id);

      if(requestType == "update") {
        if(id)
          method = "PUT"
      } else if(requestType == "delete") {
        method = "DELETE"
      } else if(requestType == "create") {
        method = "POST"
      } else {
        throw(gettext("Unknown request type:") + " "+requestType); ///
      }

      PeeringDB.API.request(
        method,
        endpoint,
        id,
        data,
        function(r) {
          if(r)
            me.trigger("success", r.data[0]);
          else
            me.trigger("success", {});
        }
      ).fail(function(r) {
        if(r.status == 400) {
          var k,i,info=[gettext("The server rejected your data")]; ///
          for(k in r.responseJSON) {
            if(k == "meta") {
              var err = r.responseJSON.meta.error;
              if(err.indexOf(gettext("not yet been approved")) > 0) { //////
                info.push(gettext("Parent entity pending review - please wait for it to be approved before adding entities to it")) ///
              } else if(err != "Unknown")
                info.push(r.responseJSON.meta.error)
              continue;
            }
            sender.find('[data-edit-name="'+k+'"]').each(function(idx) {

              var input = $(this).data("edit-input-instance");
              if(input)
                input.show_validation_error(r.responseJSON[k]);
            });
            if(k == "non_field_errors") {
              var i;
              for(i in r.responseJSON[k])
                info.push(r.responseJSON[k][i]);
            }
          }

          me.trigger("error", {
            type : "HTTPError",
            info : info.join("<br />")
          });
        } else {
          if(r.responseJSON && r.responseJSON.meta && r.responseJSON.meta.error)
             var info = r.responseJSON.meta.error;
          else
             var info = r.status+" "+r.statusText

          me.trigger("error", {
            type : "HTTPError",
            info : info
          });
        }
      });
    }
  },
  "base"
);

/*
 * editable api listing module
 */

twentyc.editable.module.register(
  "api_listing",
  {
    loading_shim : true,

    init : function() {
      this.listing_init();
      this.container.on("listing:row-add", function(e, rowId, row, data, me) {
        var target = me.target;
        if(!target)
          target = me.get_target();
        var finalizer = "finalize_row_"+target.args[1];
        if(me[finalizer]) {
          me[finalizer](rowId, row, data);
        }

        // set sorting and filtering values on new row
        row.find('[data-sort-name], [data-filter-name]').each(function(idx) {
          var filter = $(this).data('filter-name')
          var sort = $(this).data('sort-name')
          if(filter)
            $(this).attr('data-filter-value', data[filter])
          if(sort)
            $(this).attr('data-sort-value', data[sort])
        });

        $(this).find("[data-filter-target]").filterInput("retest");
        // always show newly added row
        row.show();
        row.addClass("status-"+data.status)
        PeeringDB.fix_list_offsets()
        if(me.components.add)
            me.components.add.editable("reset");
      });
    },

    add : function(id, trigger, container, data, context) {
      var me =this;
      var sentData = data;
      this.target.data = data;
      this.target.args[2] = "update"
      this.target.context = this.components.add || context;
      $(this.target).on("success", function(ev, data) {
        var finalizer = "finalize_add_"+me.target.args[1];
        if(me[finalizer]) {
          container.editable("loading-shim","show");
          me[finalizer](data, function(data) {
            me.listing_add(data.id, trigger, container, data);
            container.editable("loading-shim","hide");
          }, sentData);
        } else {
          me.listing_add(data.id, trigger, container, data);
        }
      });
      container.editable("clear-error-popins");
      this.target.execute();
    },

    submit : function(id, data, row, trigger, container) {
      data._id = id;
      this.target.data = data;
      this.target.args[2] = "update"
      this.target.context = row;
      this.target.execute();
    },

    remove : function(id, row, trigger, container) {
      var b = confirm(gettext("Remove") + " "+row.data("edit-label")); ///
      var me = this;
      $(this.target).on("success", function(ev, data) {
        if(b)
          me.listing_remove(id, row, trigger, container);
      });

      if(b) {
        this.target.args[2] = "delete";
        this.target.data = { _id : id };
        this.target.execute();
      } else {
        $(this.target).trigger("success", ["Canceled"]);
      }
    },

    // FINALIZERS: IX

    finalize_row_ix : function(rowId, row, data) {
      // finalize ix row after add
      // we need to make sure that the ix name
      // is rendered as a link

      var ixlnk = $('<a></a>');
      ixlnk.attr("href", "/ix/"+data.id);
      ixlnk.text(data.name);
      row.find(".name").html(ixlnk);

      row.data("edit-label", gettext("Exchange") + ": " +data.name); ///
    },


    // FINALIZERS: NET

    finalize_row_net : function(rowId, row, data) {
      // finalize net row after add
      // we need to make sure that the network name
      // is rendered as a link

      var netlnk = $('<a></a>');
      netlnk.attr("href", "/net/"+data.id);
      netlnk.text(data.name);
      row.find(".name").html(netlnk);

      row.data("edit-label", gettext("Participant") + ": " +data.name); ///
    },


    // FINALIZERS: FAC

    finalize_row_fac : function(rowId, row, data) {
      // finalize fac row after add
      // we need to make sure that the facility name
      // is rendered as a link

      var faclnk = $('<a></a>');
      faclnk.attr("href", "/fac/"+data.id);
      faclnk.text(data.name);
      row.find(".name").html(faclnk);

      row.data("edit-label", gettext("Facility") + ": " +data.name); ///
    },

    // FINALIZERS: POC

    finalize_row_poc : function(rowId, row, data) {
      row.editable("payload", {
        net_id : data.network,
        role : data.role
      })

      row.data("edit-label", gettext("Network Contact") + ": "+data.name);  ///
    },

    // FINALIZERS: NETIX

    finalize_row_netixlan : function(rowId, row, data) {

      // finalize netix row after add
      // we need to make sure that the exchange name
      // is rendered as a link and that speed is
      // formatted in a humanized way

      var ixlnk = $('<a></a>');
      ixlnk.attr("href", "/ix/"+data.ix.id);
      ixlnk.text(data.ix.name);
      row.find(".exchange").html(ixlnk);

      // if ixlan has a name, render it next to the exchange name
      if(data.ixlan.name)
        row.find(".exchange").append($('<span>').addClass('tiny suffix').text(data.ixlan.name));
      //row.find(".asn").html(data.asn)
      row.find(".speed").data("edit-content-backup", PeeringDB.pretty_speed(data.speed))

      row.editable("payload", {
        ixlan_id : data.ixlan.id,
        net_id : data.net.id
      });

      // this needs to be fixed in twentyc.edit.js
      var rs_peer_html = twentyc.editable.templates.copy("check")
      twentyc.editable.input.get("bool").prototype.template_handlers["check"](data.is_rs_peer, rs_peer_html);
      row.find(".is_rs_peer").data("edit-content-backup", rs_peer_html)

      row.data("edit-label", gettext("Network - Exchange link") + ": "+data.ix.name); ///

    },

    finalize_add_netixlan : function(data, callback) {

      // finalize netix data after add
      // we need to get ix name

      if(!data.ipaddr4)
          data.ipaddr4="";
      if(!data.ipaddr6)
          data.ipaddr6="";

      PeeringDB.API.get("ixlan", data.ixlan_id, function(ixlan) {
        data.ixlan = ixlan;
        PeeringDB.API.get("ix", ixlan.ix_id, function(ix) {
          data.ix = ix;
          data.exchange_name = ix.name;
          callback(data);
        });
      });

    },


    // FINALIZERS: NETFAC

    finalize_row_netfac : function(rowId, row, data) {

      // finalize netfac row after add
      // we need to make sure that the facility name
      // is rendered as a link

      var faclnk = $('<a></a>');
      faclnk.attr("href", "/fac/"+data.fac_id);
      faclnk.text(data.facility);
      row.find(".facility").html(faclnk);

      row.editable("payload", {
        fac_id : data.fac_id,
        net_id : data.net_id,
        local_asn : data.local_asn
      });

      row.data("edit-label", gettext("Network - Facility link") + ": "+data.facility); ///

    },

    finalize_add_netfac : function(data, callback) {

      // finalize netfac data after add
      // we need to get facility data so we can fill in
      // the fields accordingly

      PeeringDB.API.get("fac", data.fac_id, function(r) {
        data.country = r.country;
        data.city = r.city;
        data.fac_id = r.id;
        data.facility = r.name;
        callback(data);
      });

    },

    // FINALIZERS: IXLAN

    finalize_add_ixlan : function(data, callback, sentData) {

      // we currently do not publish ix-f setting fields on the API
      // so we need to set those from sent data
      data.ixf_ixp_member_list_url = sentData.ixf_ixp_member_list_url;
      data.ixf_ixp_import_enabled = sentData.ixf_ixp_import_enabled;
      callback(data);
    },


    finalize_row_ixlan : function(rowId, row, data) {
      row.editable("payload", {
        ix_id : data.ix_id
      })
      row.data("edit-label", gettext("IXLAN") + ": "+data.name); ///

      var modPrefix = row.find('[data-edit-module="api_listing"]');
      modPrefix.editable("sync");
      modPrefix.editable("toggle");

      var cmpPrefixAdd = row.find('[data-edit-component="add"]')
      cmpPrefixAdd.editable("payload", {
        ixlan_id : data.id
      });
    },

    // FINALIZERS: IXLAN PREFIX

    finalize_row_ixpfx : function(rowId, row, data) {
      row.editable("payload", {
        ixlan_id : data.ixlan_id
      })
      row.data("edit-label", gettext("IXLAN Prefix") +data.prefix);  ///
    },

    // FINALIZERS: IXFAC

    finalize_row_ixfac : function(rowId, row, data) {

      // finalize icfac row after add
      // we need to make sure that the facility name
      // is rendered as a link

      var faclnk = $('<a></a>');
      faclnk.attr("href", "/fac/"+data.fac_id);
      faclnk.text(data.facility);
      row.find(".facility").html(faclnk);

      row.editable("payload", {
        fac_id : data.fac_id,
        ix_id : data.ix_id,
      });

      row.data("edit-label", gettext("Exchange - Facility link") + ": "+data.facility); ///

    },

    finalize_add_ixfac : function(data, callback) {

      // finalize ixfac data after add
      // we need to get facility data so we can fill in
      // the fields accordingly
      //
      // this is identical to what we need to for netfac, so
      // just use that

      this.finalize_add_netfac(data, callback);

    }

  },
  "listing"
);

/*
 * showdown (markdown) input type
 */

twentyc.editable.input.register(
  "markdown",
  {
    apply : function(value) {
      var converter = new showdown.Converter()
      if(!value)
        value = "";
      var html = converter.makeHtml(value.replace(/>/g, '&gt;').replace(/</g, '&lt;'))
      this.source.html(DOMPurify.sanitize(html, {SAFE_FOR_JQUERY: true}))
      this.source.find('a').each(function(idx) {
        var url = $(this).attr("href"), valid = true;
        if(url && !url.match(/^([^:]+):/))
          url = "http://"+url;
        if(url && !url.match(/^(http|https):/i))
          valid = false;
        if(!valid || !url)
          $(this).attr("href","")
        else
          $(this).attr("href", url)
      });
      this.source.data("edit-value", value)
    }
  },
  "text"
);
/*
 * autocomplete input type
 */

twentyc.editable.input.register(
  "autocomplete",
  {
    confirm_handlers : {},
    wire : function() {
      var input = this.element;
      var url = "/autocomplete/"+this.source.data("edit-autocomplete")

      input.yourlabsAutocomplete(
        {
          url : "/autocomplete/"+
                this.source.data("edit-autocomplete"),
          minimumCharacters : 2,
          choiceSelector : "span",
          inputClick : function(e) { return ; }
        }
      ).input.bind("selectChoice", function(a,b) {
        input.data("value" , b.data("value"));
        input.val(b.text());
        input.removeClass("invalid");
        input.addClass("valid");
        this.render_confirm(b.data("value"));
      }.bind(this));
      // turn off auto-complete firefox workaround
      if(/Firefox/i.test(navigator.userAgent)) {
        $(window).off('scroll', $.proxy(this.hide, this))
      }

      if(this.source.data("edit-autocomplete-text") && this.source.data("edit-value")) {
        input.val(this.source.data("edit-autocomplete-text"));
        input.data("edit-value", this.source.data("edit-value"));
        input.data("value", this.source.data("edit-value"));
      }


    },

    reset_confirm : function() { this.confirm_node().empty(); },
    render_confirm : function(id) {
      var hdl;
      if(hdl=this.confirm_handlers[this.source.data("edit-autocomplete")])
        hdl.apply(this, [id])
    },
    confirm_node : function() {
      return this.source.siblings("[data-autocomplete-confirm]")
    },
    reset : function(resetValue) {
      twentyc.editable.input.get("base").prototype.reset.call(this, resetValue);
      this.element.data("value","")
      this.reset_confirm();
    },
    get : function() {
      var val = this.element.data("value");
      if(val === 0 || val === "") {
        if(this.source.data("edit-autocomplete-allow-nonexistent")) {
          val = this.element.val();
        }
      }
      return val;
    },
    set : function(value) {
      if(value && value.split)
        var t = value.split(";");
      else
        var t = []
      this.element.data("value", t[0]);
      this.element.val(t[1]);
    },
    validate : function() {
      if(!this.source.data("edit-autocomplete-allow-nonexistent")) {
        if(this.get())
          return this.get() > 0;
      }
      return true;
    }
  },
  "string"
);

twentyc.editable.input.get("autocomplete").prototype.confirm_handlers.fac = function(id) {
  PeeringDB.API.get("fac", id, function(data) {
    this.confirm_node().html(
      [
      $('<div>').text(data.address1),
      $('<div>').text(data.address2),
      $('<div>').text(data.city+", "+data.state+", "+data.zipcode),
      $('<div>').text(data.country)
      ]
    )
  }.bind(this));
}

/*
 * network speed input type
 */



twentyc.editable.input.register(
  "network_speed",
  {
    apply : function(value) {
      this.source.html(PeeringDB.pretty_speed(this.get()));
    }
  },
  "number"
);

/*
 * set up input templates
 */

twentyc.editable.templates.register("check", $('<img class="checkmark" />'));
twentyc.editable.templates.register("poc_email", $('<a></a>'));

/*
 * set up input template handlers
 */

twentyc.editable.input.get("bool").prototype.template_handlers["check"] = function(value, node, input) {
  if(input)
    node.attr("src", STATIC_URL+"checkmark"+(input.get()?"":"-off")+".png");
  else
    node.attr("src", STATIC_URL+"checkmark"+(value?"":"-off")+".png");
}

twentyc.editable.input.get("string").prototype.template_handlers["poc_email"] = function(value, node, input) {
  var email = input.source.next().data("edit-input-instance").get()
  if(email) {
    node.attr("href", "mailto:"+email)
  } else {
    node.addClass("empty")
  }
  node.text(input.get());
}

/*
 *  set up data loaders
 */

twentyc.data.loaders.register(
  "data",
  {
    data : function(id, config) {
      config.url = "/data/"+id;
      this.XHRGet(id, config);
    }
  },
  "XHRGet" ///
);

twentyc.data.loaders.register(
  "org_admin",
  {
    "org_admin" : function(id, config) {
      config.url = "/org_admin/"+id;
      config.data = {org_id:this.orgId};
      this.XHRGet(id, config);
    }
  },
  "XHRGet" ///
);

twentyc.data.loaders.register(
  "network_data",
  {
    "network_data" : function(id, config) {
      config.url = "/data/"+id
      config.data = {id:this.id};
      this.XHRGet(id, config);
    }
  },
  "XHRGet" ///
);

$.urlParam = function(name){
  var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
  if(!results)
    return 0;
  return results[1] || 0;
}

twentyc.data.loaders.assign("locales", "data");
twentyc.data.loaders.assign("countries", "data");
twentyc.data.loaders.assign("countries_b", "data");
twentyc.data.loaders.assign("facilities", "data");
twentyc.data.loaders.assign("sponsors", "data");
twentyc.data.loaders.assign("enum/regions", "data");
twentyc.data.loaders.assign("enum/org_groups", "data");
twentyc.data.loaders.assign("enum/media", "data");
twentyc.data.loaders.assign("enum/net_types", "data");
twentyc.data.loaders.assign("enum/net_types_trunc", "data");
twentyc.data.loaders.assign("enum/net_types_advs", "data");
twentyc.data.loaders.assign("enum/ratios", "data");
twentyc.data.loaders.assign("enum/ratios_trunc", "data");
twentyc.data.loaders.assign("enum/ratios_advs", "data");
twentyc.data.loaders.assign("enum/traffic", "data");
twentyc.data.loaders.assign("enum/scopes", "data");
twentyc.data.loaders.assign("enum/scopes_trunc", "data");
twentyc.data.loaders.assign("enum/scopes_advs", "data");
twentyc.data.loaders.assign("enum/protocols", "data");
twentyc.data.loaders.assign("enum/poc_roles", "data");
twentyc.data.loaders.assign("enum/policy_general", "data");
twentyc.data.loaders.assign("enum/policy_locations", "data");
twentyc.data.loaders.assign("enum/policy_contracts", "data");
twentyc.data.loaders.assign("enum/visibility", "data");
twentyc.data.loaders.assign("enum/bool_choice_str", "data");

$(twentyc.data).on("load-enum/traffic", function(e, payload) {
  var r = {}, i = 0, data=payload.data;
  for(i=0; i<data.length; i++)
    r[data[i].name] = i
  twentyc.data._data["traffic_speed_by_label"] = r;
});

$(window).bind("load", function() {
  PeeringDB.init();
})

(function (root) {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function adjustInputWidth(input) {
    const value = Number.parseFloat(input.value);
    input.style.width = Number.isFinite(value) && value >= 999 ? "150px" : "70px";
  }

  function bindInputWidthById(id) {
    const input = document.getElementById(id);
    if (!input) {
      return;
    }
    adjustInputWidth(input);
    input.addEventListener("input", () => {
      adjustInputWidth(input);
    });
  }

  function bindMutualExclusiveCheckbox(primaryId, secondaryId) {
    const primary = document.getElementById(primaryId);
    const secondary = document.getElementById(secondaryId);
    if (!primary || !secondary) {
      return;
    }
    primary.addEventListener("change", () => {
      if (primary.checked) {
        secondary.checked = false;
      }
    });
  }

  function handleOpActionLink(link) {
    const action = link.getAttribute("data-action");
    if (!action) {
      return;
    }
    if (action === "ig" && typeof root.f_ig === "function") {
      root.f_ig(link);
      return;
    }
    if (action === "split" && typeof root.f_split === "function") {
      root.f_split(link);
      return;
    }
    if (action === "tag" && typeof root.f_tag === "function") {
      root.f_tag(link);
    }
  }

  function handleClickAction(action) {
    if (action === "addRequirement" && typeof root.f_add === "function") {
      root.f_add();
      return;
    }
    if (action === "resetRequirement" && typeof root.f_reset === "function") {
      root.f_reset();
      return;
    }
    if (action === "saveProject" && typeof root.f_save === "function") {
      root.f_save();
      return;
    }
    if (action === "generateBlueprint" && typeof root.generateBlueprint === "function") {
      root.generateBlueprint();
      return;
    }
    if (action === "resetExclude" && typeof root.f_reset_ig === "function") {
      root.f_reset_ig();
      return;
    }
    if (action === "excludeAccLine" && typeof root.f_ig_acc === "function") {
      root.f_ig_acc();
    }
  }

  onReady(() => {
    bindInputWidthById("txtnumber");
    bindInputWidthById("selmaince");

    bindMutualExclusiveCheckbox("onlySorterMk3", "useSorterMk4");
    bindMutualExclusiveCheckbox("useSorterMk4", "onlySorterMk3");

    document.addEventListener("click", event => {
      const link = event.target.closest("a[data-action]");
      if (!link) {
        const actionNode = event.target.closest("[data-click-action]");
        if (!actionNode) {
          return;
        }
        event.preventDefault();
        handleClickAction(actionNode.getAttribute("data-click-action"));
        return;
      }
      event.preventDefault();
      handleOpActionLink(link);
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

Flux.createStore = function (spec) {
	var store = new Store
	extend(store, spec)

	if (isFunction(spec.initialize)) {
		spec.initialize.call(store)
	}

	return store
}

Flux.createAction = function (name) {
	var controller = Stream.create(),
		action = function Action(data) {
			controller.add(data)
		},
		extra = {
			actionName: name,
			listen: function () {
				controller.stream.listen.apply(controller.stream, arguments)
			}
		}

	extend(action, extra)

	return action
}

Flux.createActions = function (spec) {
	var actions = {}
	for (var action in spec) {
		if (spec.hasOwnProperty(action)) {
			var value = spec[action],
				actionName = isObject(value) ? action : value

			actions[actionName] = isObject(value) ?
				this.createActions(value) :
				this.createAction(actionName)
		}
	}
	return actions
}



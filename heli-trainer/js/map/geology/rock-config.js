// v84 geology-driven rock placement parameters.
export const ROCK_LAYER_CONFIG=Object.freeze({
  version:84,
  source:'ozeti-terrain-geology-v83.png:G',
  deterministic:true,
  layers:Object.freeze({
    cliff:Object.freeze({model:'rock.cliff',spacingMeters:32,threshold:0.26,density:0.72}),
    medium:Object.freeze({model:'rock.medium',spacingMeters:16,threshold:0.20,density:0.72}),
    small:Object.freeze({model:'rock.small',spacingMeters:8,threshold:0.12,density:0.39})
  })
});

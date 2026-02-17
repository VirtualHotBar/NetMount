use crate::State;

include!(concat!(env!("OUT_DIR"), "/language.rs"));

pub struct Locale(pub &'static Pack);

impl Locale {
    pub fn new(name: &str) -> Self {
        Self(get_lang(name))
    }

    pub fn get(&self, id: &'static str) -> &'static str {
        self.0.get(id).map_or(id, |v| *v)
    }
}

impl State for Locale {}

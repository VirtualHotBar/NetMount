use std::sync::RwLock;

include!(concat!(env!("OUT_DIR"), "/codegen.rs"));

pub struct LocaleState(pub RwLock<Option<Locale>>);

pub struct Locale(pub Pack);

impl Locale {
    pub fn new(name: &str) -> Self {
        Self(get_lang(name))
    }

    pub fn get(&self, id: &'static str) -> &'static str {
        self.0.get(id).unwrap()
    }
}

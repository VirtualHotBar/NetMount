use crate::State;

include!(concat!(env!("OUT_DIR"), "/language.rs"));

pub struct Locale(pub &'static Pack);

impl Locale {
    pub fn new(name: &str) -> Self {
        Self(get_lang(name))
    }

    pub fn get(&self, id: &'static str) -> &'static str {
        println!("{:?} {}", self.0, id);
        self.0.get(id).unwrap()
    }
}

impl State for Locale {}
